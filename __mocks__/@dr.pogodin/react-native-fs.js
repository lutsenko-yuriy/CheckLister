// Manual Jest mock for @dr.pogodin/react-native-fs: an in-memory file tree
// (the real module needs the native file system). Tests seed it with
// __seedFile() and read it back with __files() / __dirs().
const files = new Set();
const dirs = new Set();

const parentOf = path => path.slice(0, path.lastIndexOf('/'));
const isUnder = (path, root) => path === root || path.startsWith(`${root}/`);

module.exports = {
  DocumentDirectoryPath: '/docs',
  LibraryDirectoryPath: '/library',
  CachesDirectoryPath: '/caches',
  exists: jest.fn(async path => files.has(path) || dirs.has(path)),
  mkdir: jest.fn(async path => {
    let current = path;
    while (current) {
      dirs.add(current);
      current = parentOf(current);
    }
  }),
  moveFile: jest.fn(async (from, into) => {
    if (!files.has(from)) {
      throw new Error(`ENOENT: ${from}`);
    }
    files.delete(from);
    files.add(into);
  }),
  copyFile: jest.fn(async (from, into) => {
    if (!files.has(from)) {
      throw new Error(`ENOENT: ${from}`);
    }
    files.add(into);
  }),
  unlink: jest.fn(async path => {
    if (!files.has(path) && !dirs.has(path)) {
      throw new Error(`ENOENT: ${path}`);
    }
    [...files].filter(f => isUnder(f, path)).forEach(f => files.delete(f));
    [...dirs].filter(d => isUnder(d, path)).forEach(d => dirs.delete(d));
  }),
  readDir: jest.fn(async path => {
    if (!dirs.has(path)) {
      throw new Error(`ENOENT: ${path}`);
    }
    const names = new Map();
    files.forEach(f => {
      if (parentOf(f) === path) {
        names.set(f, false);
      }
    });
    dirs.forEach(d => {
      if (parentOf(d) === path) {
        names.set(d, true);
      }
    });
    return [...names].map(([full, isDir]) => ({
      name: full.slice(path.length + 1),
      path: full,
      isDirectory: () => isDir,
      isFile: () => !isDir,
    }));
  }),
  __seedFile: path => {
    files.add(path);
    dirs.add(parentOf(path));
  },
  __files: () => [...files].sort(),
  __dirs: () => [...dirs].sort(),
  __reset: () => {
    files.clear();
    dirs.clear();
  },
};
