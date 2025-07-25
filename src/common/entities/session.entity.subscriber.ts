import { BadRequestException } from '@nestjs/common';
import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent
} from 'typeorm';
import { Session } from './session.entity';

@EventSubscriber()
export class SessionSubscriber implements EntitySubscriberInterface<Session> {
  listenTo() {
    return Session;
  }

  async beforeInsert(event: InsertEvent<Session>) {
    this.ensureSessionTypeConsistency(event.entity);
  }

  async beforeUpdate(event: UpdateEvent<Session>) {
  }

 async afterUpdate(event: UpdateEvent<Session>): Promise<any> {
    console.log('Session updated: - session.entity.subscriber.ts:24', event.entity);
 }

  private ensureSessionTypeConsistency(session: Session) {
    
    console.log('Ensuring session type consistency for: - session.entity.subscriber.ts:29', session);
    const hasClient = !!session.client;
    const hasGroup = !!session.group && session.group.length > 0;

    if (hasClient && hasGroup) {
      throw new BadRequestException(
        'A session cannot have both a client and group. Choose one.'
      );
    }

    if (!hasClient && !hasGroup) {
      throw new BadRequestException(
        'A session must have either an individual or group.'
      );
    }
  }
}
