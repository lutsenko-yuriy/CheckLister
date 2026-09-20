package com.checklister

import android.content.Intent
import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

internal fun Intent.isExternalRunIntent(): Boolean =
  action == Intent.ACTION_VIEW &&
    data?.scheme == "checklister" &&
    data?.host == "run"

@ReactModule(name = ExternalRunLinkingModule.NAME)
class ExternalRunLinkingModule(
  private val context: ReactApplicationContext,
) : ReactContextBaseJavaModule(context) {
  override fun getName(): String = NAME

  @ReactMethod
  fun activate(promise: Promise) {
    context.runOnUiQueueThread {
      isActive = true
      val activity = context.currentActivity
      val intent = activity?.intent
      val pendingUrls = Arguments.createArray()
      if (intent?.isExternalRunIntent() == true) {
        pendingUrls.pushString(intent.data.toString())
        activity.intent =
          Intent(Intent.ACTION_MAIN).apply {
            setClass(activity, MainActivity::class.java)
            addCategory(Intent.CATEGORY_LAUNCHER)
          }
      }
      promise.resolve(pendingUrls)
    }
  }

  @ReactMethod
  fun deactivate() {
    context.runOnUiQueueThread {
      isActive = false
    }
  }

  companion object {
    const val NAME = "ExternalRunLinking"

    @Volatile
    internal var isActive = false
      private set
  }
}

class ExternalRunLinkingPackage : BaseReactPackage() {
  override fun getModule(
    name: String,
    reactContext: ReactApplicationContext,
  ): NativeModule? =
    if (name == ExternalRunLinkingModule.NAME) {
      ExternalRunLinkingModule(reactContext)
    } else {
      null
    }

  override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
    mapOf(
      ExternalRunLinkingModule.NAME to
        ReactModuleInfo(
          ExternalRunLinkingModule.NAME,
          ExternalRunLinkingModule::class.java.name,
          false,
          false,
          false,
          false,
        ),
    )
  }
}
