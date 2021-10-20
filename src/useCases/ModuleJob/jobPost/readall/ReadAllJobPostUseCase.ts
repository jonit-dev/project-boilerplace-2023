import { IJobPost, JobPost } from "@entities/ModuleJob/JobPostModel";
import { IPaginationResponse } from "@project-remote-job-board/shared/dist";
import { MongooseQueryParserHelper } from "@providers/adapters/MongooseQueryParserHelper";
import { JobPostRepository } from "@repositories/ModuleJob/jobPost/JobPostRepository";
import { provide } from "inversify-binding-decorators";

@provide(ReadAllJobPostUseCase)
export class ReadAllJobPostUseCase {
  constructor(private jobPostRepository: JobPostRepository) {}

  public async readAll(filter: Record<string, unknown>): Promise<IPaginationResponse<IJobPost>> {
    const offset = Number(filter.offset || 0);
    delete filter.offset;
    const parser = new MongooseQueryParserHelper();
    const parsedFilter = parser.queryParser(filter);

    const results = await this.jobPostRepository.readAllPaginated<IJobPost>(
      JobPost,
      parsedFilter,
      null,
      null,
      true,
      offset,
      null,
      null
    );

    return results;
  }
}
