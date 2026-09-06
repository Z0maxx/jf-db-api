import { BaseEntity, Collection, defineEntity, p } from '@mikro-orm/core';
import { AllOutParticipant } from './AllOutParticipant';
import { AllOutStage1Map } from './AllOutStage1Map';
import { AllOutStage2Map } from './AllOutStage2Map';
import { AllOutStage3Map } from './AllOutStage3Map';

export class AllOutEvent extends BaseEntity {
  id!: number;
  description!: string;
  stage1Start!: Date;
  stage2Start!: Date;
  stage3Start!: Date;
  stage1End!: Date;
  stage2End!: Date;
  stage3End!: Date;
  stage1Description!: string;
  stage2Description!: string;
  stage3Description!: string;
  allOutParticipantCollection = new Collection<AllOutParticipant>(this);
  allOutStage1MapCollection = new Collection<AllOutStage1Map>(this);
  allOutStage2MapCollection = new Collection<AllOutStage2Map>(this);
  allOutStage3MapCollection = new Collection<AllOutStage3Map>(this);
}

export const AllOutEventSchema = defineEntity({
  class: AllOutEvent,
  checks: [
    {
      name: 'chk_all_out_event_description',
      expression: 'char_length(`description`) > 0',
    },
  ],
  properties: {
    id: p.integer().primary(),
    description: p.text().length(65535),
    stage1Start: p.datetime().name('stage_1_start'),
    stage2Start: p.datetime().name('stage_2_start'),
    stage3Start: p.datetime().name('stage_3_start'),
    stage1End: p.datetime().name('stage_1_end'),
    stage2End: p.datetime().name('stage_2_end'),
    stage3End: p.datetime().name('stage_3_end'),
    stage1Description: p.text().name('stage_1_description').length(65535),
    stage2Description: p.text().name('stage_2_description').length(65535),
    stage3Description: p.text().name('stage_3_description').length(65535),
    allOutParticipantCollection: () => p.oneToMany(AllOutParticipant).mappedBy('event'),
    allOutStage1MapCollection: () => p.oneToMany(AllOutStage1Map).mappedBy('event'),
    allOutStage2MapCollection: () => p.oneToMany(AllOutStage2Map).mappedBy('event'),
    allOutStage3MapCollection: () => p.oneToMany(AllOutStage3Map).mappedBy('event'),
  },
});
