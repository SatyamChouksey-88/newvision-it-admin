import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ChatController } from './chat.controller';
import { ChatPresenceService } from './chat.presence';
import { ChatRealtimeService } from './chat.realtime';
import { ChatService } from './chat.service';
import { PusherAuthController } from './pusher-auth.controller';

@Module({
  imports: [AuthModule],
  controllers: [ChatController, PusherAuthController],
  providers: [ChatService, ChatRealtimeService, ChatPresenceService],
  exports: [ChatService, ChatPresenceService],
})
export class ChatModule {}
