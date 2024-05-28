
import StatusConfig from "@/entities/settings/StatusConfig";
import { prospects } from "@/consts/slack";

    function extractTextAndEmoji(input) {
        const regex = /^(:\w+:)?(.*)$/;
        const matches = input.match(regex);
    return {
            emoji: matches && matches[1] ? matches[1] : "",
            text: matches ? matches[2] : "",
        };
    }
  
  export const getProspects = async (statusConfig: StatusConfig) => {
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