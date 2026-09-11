import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatPresenceService } from './chat.presence';
import { ChatRealtimeService } from './chat.realtime';
import { ChatService } from './chat.service';

@Module({
  imports: [AuthModule],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway, ChatRealtimeService, ChatPresenceService],
  exports: [ChatService, ChatPresenceService],
})
export class ChatModule {}
