import { Injectable } from '@nestjs/common';

import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import type { z } from 'zod';

@Injectable()
export class OpenaiAssistantService {
  private readonly openai: OpenAI;
  private readonly OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  constructor() {
    this.openai = new OpenAI({
      apiKey: this.OPENAI_API_KEY,
    });
  }

  async generateSummary(
    content: string,
    characterLimit: number,
  ): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `
          You are asked to summarize a content. 
          
            IMPORTANT RULES: 
              - Explain it in +- ${characterLimit} characters
              - Use simple language
              - Do not copy-paste from the internet
              - Don't start your explanation with "insert topic" is a.. or "insert topic" refers to.. Simply focus on a detailed description.
            `,
        },
        {
          role: 'user',
          content: `Summarize this content: \n\n${content}`,
        },
      ],
      temperature: 0,
      top_p: 1,
    });
    return response.choices[0].message.content || '';
  }

  async chatCompletion(
    model: string,
    messages: { role: 'user' | 'system'; content: string }[],
    schema?: any,
  ): Promise<string> {
    const chatCompletionOptions: OpenAI.Chat.Completions.ChatCompletionCreateParams =
      {
        model: model,
        messages: messages,
      };
    if (schema) {
      chatCompletionOptions.response_format = zodResponseFormat(
        schema,
        'response',
      );
    }

    const response = await this.openai.chat.completions.create(
      chatCompletionOptions,
    );

    const content = response.choices[0].message.content as string;
    return content;
  }

  async formatToJson(content: string, schema: any, model = 'gpt-4o-mini') {
    const response = await this.openai.beta.chat.completions.parse({
      model: model,
      messages: [
        {
          role: 'user',
          content: content,
        },
      ],
      response_format: zodResponseFormat(schema, 'response'),
    });
    return response.choices[0].message.parsed;
  }
}
