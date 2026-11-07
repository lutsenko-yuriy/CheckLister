import { FileSystem } from 'react-native-file-access';
import * as RNFA from 'react-native-file-access';
import { ScenarioPhotoPicker } from './ScenarioPhotoPicker';

const fs = RNFA as unknown as { __files(): string[]; __reset(): void };

describe('ScenarioPhotoPicker', () => {
  beforeEach(() => fs.__reset());

  it('returns a fixture photo from the cache directory by default', async () => {
    const result = await new ScenarioPhotoPicker().pick('library');

    expect(result.type).toBe('picked');
    expect(result.type === 'picked' && result.uri).toMatch(
      /^file:\/\/\/caches\/.+\.jpg$/,
    );
    expect(fs.__files()).toHaveLength(1);
  });

  it('writes a new file for every pick, as a real picker does', async () => {
    const picker = new ScenarioPhotoPicker();
    await picker.pick('camera');
    await picker.pick('camera');

    expect(fs.__files()).toHaveLength(2);
  });

  it.each(['denied', 'cancelled'] as const)(
    'returns %s after it was set, and writes no file',
    async type => {
      const picker = new ScenarioPhotoPicker();
      picker.setResult(type);

      expect(await picker.pick('camera')).toEqual({ type });
      expect(fs.__files()).toEqual([]);
    },
  );

  it('goes back to picking when set to picked', async () => {
    const picker = new ScenarioPhotoPicker();
    picker.setResult('denied');
    picker.setResult('picked');

    expect((await picker.pick('library')).type).toBe('picked');
  });

  it('reports a failed write as failed instead of rejecting', async () => {
    jest.mocked(FileSystem.writeFile).mockRejectedValueOnce(new Error('disk'));

    expect(await new ScenarioPhotoPicker().pick('library')).toEqual({
      type: 'failed',
    });
  });
});
