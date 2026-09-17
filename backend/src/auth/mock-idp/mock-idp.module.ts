import { Module } from '@nestjs/common';
import { mockIdpEnabled } from '../entra/entra-config';
import { MockIdpController } from './mock-idp.controller';

/**
 * Registers the mock IdP's controller only when mockIdpEnabled() is true. That function
 * hard-returns false whenever NODE_ENV==='production', regardless of any env var — so even a
 * misconfigured MOCK_ENTRA_IDP_ENABLED=true can never expose this in a production deployment.
 */
@Module({
  controllers: mockIdpEnabled() ? [MockIdpController] : [],
})
export class MockIdpModule {}
