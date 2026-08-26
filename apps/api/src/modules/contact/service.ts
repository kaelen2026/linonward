import { ApiError } from "../../shared/api-error.js";
import type { Inquiry, InquiryRepository } from "./repository.js";
import type { InquiryInput } from "./schema.js";

export type InquiryServiceDependencies = {
  repository: InquiryRepository;
  clock: () => Date;
  nextId: () => string;
};

export type InquiryService = {
  submit(input: InquiryInput): Promise<Inquiry>;
  get(id: string): Promise<Inquiry>;
};

export function createInquiryService({
  repository,
  clock,
  nextId,
}: InquiryServiceDependencies): InquiryService {
  return {
    async submit(input) {
      const inquiry: Inquiry = {
        ...input,
        // Case is not significant in the mailbox part in practice, and the same
        // person writing twice should not become two contacts.
        email: input.email.toLowerCase(),
        id: nextId(),
        receivedAt: clock().toISOString(),
      };

      await repository.save(inquiry);
      return inquiry;
    },

    async get(id) {
      const inquiry = await repository.findById(id);
      if (!inquiry) {
        throw new ApiError(404, "inquiry_not_found", `No inquiry with id ${id}`);
      }
      return inquiry;
    },
  };
}
