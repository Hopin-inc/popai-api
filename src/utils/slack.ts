
import StatusConfig from "@/entities/settings/StatusConfig";
import { prospects } from "@/consts/slack";

const extractTextAndEmoji = (input: string) => {
  const [_, emoji = "", text = ""] = input.match(/^\s*(:\w+:\s*)?(.*)$/) || [];
  return { emoji, text };
};

export const getProspects = (statusConfig: StatusConfig) => {
  if (!statusConfig) return prospects;

  return prospects.map(prospect => {
    const levelKey = Object.keys(prospect).find(key => key.startsWith("level") && prospect[key]);
    if (levelKey) {
      const levelValue = statusConfig[levelKey];
      const { emoji, text } = extractTextAndEmoji(levelValue);
      return { ...prospect, text, emoji };
    }
    return prospect;
  });
};
