#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(ExternalRunLinking, NSObject)

RCT_EXTERN_METHOD(activate:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(deactivate)

@end
