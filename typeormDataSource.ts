// typeormDataSource.ts
import { DataSource } from 'typeorm';
import { Project } from './src/project/schema/project.schema';
// Import other entities if needed

export const dataSource = new DataSource({
  type: 'postgres', // e.g., 'sqlite', 'postgres', 'mysql'
  host: 'localhost',
  port: 5432, // adjust based on your DB
  username: 'admin',
  password: 'admin',
  database: 'phlo',
  entities: [Project], // Add all your entities here
  synchronize: true, // set to false in production
});
