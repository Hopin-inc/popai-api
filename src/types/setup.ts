import { SetupFeatureId } from "@/consts/setup";

export type ISetupFeatureId = typeof SetupFeatureId[keyof typeof SetupFeatureId];

export type IConfigSetup = {
  currentStep: number | null;
  setupTodoAppId: number | null;
  setupChatToolId: number | null;
  setupFeatures: ISetupFeatureId[];
};