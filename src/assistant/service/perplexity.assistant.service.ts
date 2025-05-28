import { Injectable } from '@nestjs/common';

@Injectable()
export class PerplexityAssistantService {
  private readonly MAX_RETRIES = 10;
  private readonly RETRY_DELAY = 60000;
  private readonly PERPLEXITY_URL =
    'https://api.perplexity.ai/chat/completions';
  private readonly PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
  constructor() {}
  async askPerplexity(
    message: Record<string, string>[],
    model: string,
    max_tokens: number,
  ): Promise<{
    content: string;
    citations: string[];
  }> {
    if (!this.PERPLEXITY_API_KEY) {
      throw new Error('PERPLEXITY_API_KEY is not set');
    }

    let retryCount = 0;
    let lastError: Error | null = null;

    while (retryCount < this.MAX_RETRIES) {
      try {
        const payload = {
          model: model,
          messages: message,
          max_tokens: max_tokens,
        };

        const headers = {
          Authorization: `Bearer ${this.PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        };

        const response = await fetch(this.PERPLEXITY_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(
            `Perplexity API request failed with status ${response.status}`,
          );
        }

        const data = await response.json();
        let content = data.choices[0].message.content;
        content = content.replace(/<think>[\s\S]*?<\/think>/g, '');

        const citations: string[] = data.citations || [];

        return {
          content: content,
          citations: citations,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(
          `Error calling Perplexity API (attempt ${retryCount + 1}/${this.MAX_RETRIES}):`,
          error,
        );

        if (retryCount === this.MAX_RETRIES - 1) {
          throw lastError;
        }

        await new Promise((resolve) => setTimeout(resolve, this.RETRY_DELAY));
        retryCount++;
      }
    }

    throw lastError || new Error('Failed after maximum retries');
  }
}
