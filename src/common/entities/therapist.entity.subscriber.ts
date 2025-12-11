import { Injectable } from '@nestjs/common';
import {
  EntitySubscriberInterface,
  EventSubscriber,
  UpdateEvent,
} from 'typeorm';
import { UserTypes } from '../constants';
import { Therapist } from './therapist.entity';

@Injectable()
@EventSubscriber()
export class TherapistSubscriber implements EntitySubscriberInterface<Therapist> {
  // constructor(private readonly presenceGateway: PresenceGateway) {}

  listenTo() {
    return Therapist;
  }

  async afterUpdate(event: UpdateEvent<Therapist>) {
    const oldProfile = event.databaseEntity?.profile;
    const newProfile = event.entity?.profile;
    if (newProfile !== undefined && newProfile !== oldProfile) {
      const userId = event.entity.id;
      const userType = UserTypes.THERAPIST; // if you store type in base class
      // this.presenceGateway.notifyProfilePictureChange(userId, userType, newProfile);
    }
  }
}
