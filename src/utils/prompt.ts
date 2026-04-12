import * as prompt from '@clack/prompts';
import chalk from 'chalk';

const COMMANDS = [
  { cmd: "/help", desc: "Show this command reference" },
  { cmd: "/model", desc: "Switch LLM provider and model" },
  { cmd: "/create", desc: "Scaffold a new project" },
  { cmd: "/anime", desc: "Anime Lootbox Menu" },
  { cmd: "/buddy", desc: "Set Chat Buddy" },
  { cmd: "/clear", desc: "Clear terminal" },
  { cmd: "/memory", desc: "Show memory stats" }
];

export interface AutocompleteTextOptions {
  message: string;
  placeholder?: string;
  initialValue?: string;
}

export const autocompleteText = async (opts: AutocompleteTextOptions): Promise<string | symbol> => {

  return prompt.text({
    message: opts.message,
    placeholder: opts.placeholder,
    initialValue: opts.initialValue
  });
};
