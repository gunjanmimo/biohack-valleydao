import { Inject, Injectable } from '@nestjs/common';
import { Driver, Session } from 'neo4j-driver';
@Injectable()
export class Neo4jService {
  constructor(@Inject('NEO4J_DRIVER') private readonly driver: Driver) {
    console.log('Neo4jService initialized');
  }
  async onModuleDestroy() {
    if (this.driver) {
      await this.driver.close();
    }
  }

  getSession(): Session {
    return this.driver.session();
  }

  async executeQuery(
    query: string,
    params: Record<string, string | string[] | number | number[]> = {},
  ): Promise<any[]> {
    const session = this.getSession();
    try {
      const result = await session.run(query, params);
      return result.records.map((record) => record.toObject());
    } catch (error) {
      console.error('Error executing query:', error);
      throw new Error(`Failed to execute query: ${error.message}`);
    } finally {
      await session.close();
    }
  }
}
