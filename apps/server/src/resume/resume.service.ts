import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { HttpService } from "@nestjs/axios";
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createId } from "@paralleldrive/cuid2";
import { Prisma } from "@prisma/client";
import {
  CreateAiResumeDto,
  CreateResumeDto,
  ImportLinkedinDto,
  ImportResumeDto,
  ResumeDto,
  UpdateResumeDto,
} from "@reactive-resume/dto";
import {
  Basics,
  defaultBasics,
  defaultEducation,
  defaultExperience,
  defaultResumeData,
  defaultSection,
  defaultSkill,
  defaultUrl,
  Education,
  Experience,
  Language,
  ResumeData,
  Sections,
  Skill
} from "@reactive-resume/schema";
import type { DeepPartial } from "@reactive-resume/utils";
import { ErrorMessage, generateRandomName, kebabCase } from "@reactive-resume/utils";
import { generateObject, generateText } from "ai";
import deepmerge from "deepmerge";
import { PrismaService } from "nestjs-prisma";
import { z } from "zod";

import { PrinterService } from "@/server/printer/printer.service";

import { Config } from "../config/schema";
import { StorageService } from "../storage/storage.service";

@Injectable()
export class ResumeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly printerService: PrinterService,
    private readonly storageService: StorageService,
    private readonly configService: ConfigService<Config>,
  ) {}

  async aiCreate(userId: string, createAiResumeDto: CreateAiResumeDto) {
    if (!createAiResumeDto.existingResumeId)
      throw new BadRequestException(ErrorMessage.ResumeNotFound);

    const { name, email, picture } = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { name: true, email: true, picture: true },
    });

    const existingResume = (await this.prisma.resume.findUniqueOrThrow({
      where: { userId_id: { userId, id: createAiResumeDto.existingResumeId } },
    })) as ResumeDto;

    const jobDescription = createAiResumeDto.jobDescription ?? "";

    const newResumeData = existingResume.data;
    const existingSkills = existingResume.data.sections.skills;
    const existingSummary = existingResume.data.sections.summary;
    const existingReferences = existingResume.data.sections.references;
    const existingExperiences = existingResume.data.sections.experience;
    const existingHeadline = existingResume.data.basics.headline;

    const relevantSkillsPromise = generateObject({
      model: openai("gpt-4o"),
      system:
        "You are a sophisticated AI that helps transform candidates resumes into the best version for the job",
      prompt: `Help me select the top 5 skills for this job application from my existing list of skills. for the skill level please put 4 or 5 but nothing less.
      here is my list of skills: ${JSON.stringify(existingSkills)},
      here is the job description: ${jobDescription}`,
      schema: z.object({
        items: z.array(
          z.object({
            name: z.string(),
            description: z.string(),
            level: z.number().min(0).max(5).default(1),
            keywords: z.array(z.string()).default([]),
          }),
        ),
      }),
    });

    const betterSummaryPromise = generateObject({
      model: openai("gpt-4o"),
      system:
        "You are a sophisticated AI that helps transform candidates resumes into the best version for the job",
      prompt: `Help me refine my summary for this job application. be very concise and show my best features as a person and make it as relevant as possible. don't lie.,
      here is my current summary: ${JSON.stringify(existingSummary)},
      here is the job description: ${jobDescription}`,
      schema: z.object({ result: z.string().default("") }),
    });

    const relevantReferencesPromise = generateObject({
      model: openai("gpt-4o"),
      system:
        "You are a sophisticated AI that helps transform candidates resumes into the best version for the job",
      prompt: `Help me select the top 3 references for this job application from my existing list of references. do not make up any new one if it doesn't exist. if empty, leave it empty.,
      here is my list of references: ${JSON.stringify(existingReferences)},
      here is the job description: ${jobDescription}`,
      schema: z.object({
        items: z.array(
          z.object({
            name: z.string().min(1),
            description: z.string(),
            summary: z.string(),
          }),
        ),
      }),
    });

    const betterExperiencesPromise = generateObject({
      model: openai("gpt-4o"),
      system:
        "You are a sophisticated AI that helps transform candidates resumes into the best version for the job",
      prompt: `Help me refine my job experiences for this job application. if the experience is not fitted to the job, try and make the summary as fitted as possible but don't exaggerate. for the url, select a nice label for the link.,
      here is my current job experiences: ${JSON.stringify(existingExperiences)},
      here is the job description: ${jobDescription}`,
      schema: z.object({
        items: z.array(
          z.object({
            company: z.string().min(1),
            position: z.string(),
            location: z.string(),
            date: z.string(),
            summary: z.string(),
          }),
        ),
      }),
    });

    const betterHeadlinePromise = generateObject({
      model: openai("gpt-4o"),
      system:
        "You are a sophisticated AI that helps transform candidates resumes into the best version for the job",
      prompt: `Create the perfect headline for this role. make it concise and relevant. no longer than 5 words.
      here is my current headline: ${existingHeadline},
      here is the job description: ${jobDescription}`,
      schema: z.object({ result: z.string().default("") }),
    });

    const [relevantSkills, betterSummary, relevantReferences, betterExperiences, betterHeadline] =
      await Promise.all([
        relevantSkillsPromise,
        betterSummaryPromise,
        relevantReferencesPromise,
        betterExperiencesPromise,
        betterHeadlinePromise,
      ]);

    const newSummary = { ...existingSummary, content: betterSummary.object.result };
    const newSkills = {
      ...existingSkills,
      items: relevantSkills.object.items.map((item) => ({ ...item, visible: true })),
    };
    const newReferences = {
      ...existingReferences,
      items: relevantReferences.object.items.map((item) => ({
        ...item,
        visible: true,
        url: defaultUrl,
      })),
    };
    const newExperiences = {
      ...existingExperiences,
      items: betterExperiences.object.items.map((item) => ({
        ...item,
        visible: true,
        url: defaultUrl,
      })),
    };

    const data = deepmerge(
      newResumeData,
      {
        basics: { headline: betterHeadline.object.result },
        sections: {
          summary: newSummary,
          skills: newSkills,
          references: newReferences,
          experience: newExperiences,
        },
      } satisfies DeepPartial<ResumeData>,
      { arrayMerge: (destination, source) => source },
    );

    const resume = this.prisma.resume.create({
      data: {
        data: data,
        userId,
        lockedPremium: true,
        title: createAiResumeDto.title + " (AI)",
        visibility: createAiResumeDto.visibility,
        slug: createAiResumeDto.slug ?? kebabCase(createAiResumeDto.title),
      },
    });

    return resume;
  }

  async create(userId: string, createResumeDto: CreateResumeDto) {
    const { name, email, picture } = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { name: true, email: true, picture: true },
    });

    const data = deepmerge(defaultResumeData, {
      basics: { name, email, picture: { url: picture ?? "" } },
    } satisfies DeepPartial<ResumeData>);

    return this.prisma.resume.create({
      data: {
        data,
        userId,
        title: createResumeDto.title,
        visibility: createResumeDto.visibility,
        slug: createResumeDto.slug ?? kebabCase(createResumeDto.title),
      },
    });
  }

  import(userId: string, importResumeDto: ImportResumeDto) {
    const randomTitle = generateRandomName();

    return this.prisma.resume.create({
      data: {
        userId,
        visibility: "private",
        data: importResumeDto.data,
        lockedPremium: importResumeDto.lockedPremium,
        title: importResumeDto.title ?? randomTitle,
        slug: importResumeDto.slug ?? kebabCase(randomTitle),
      },
    });
  }

  async importFile(userId: string, base64: string, mimetype: "pdf" | "png" | "jpg" | "jpeg") {
    const { basics, experiences, skills, educations } = await fileToResume(mimetype, base64);

    const newTitle = generateRandomName() + " (File)";

    const resume = rawToResume({
      basics,
      languages: basics.languages,
      experiences,
      skills,
      educations,
      summary: basics.summary,
    });

    const data = deepmerge(defaultResumeData, {
      basics: resume.basics,
      sections: resume.sections,
    } satisfies DeepPartial<ResumeData>);

    return this.prisma.resume.create({
      data: {
        userId,
        visibility: "private",
        data,
        title: newTitle,
        slug: kebabCase(newTitle),
      },
    });
  }

  async importLinkedin(userId: string, importLinkedinDto: ImportLinkedinDto) {
    const SCRAPIN_API_KEY = this.configService.get<string>("SCRAPIN_API_KEY");
    const linkedinScrapeURL = `https://api.scrapin.io/enrichment/profile?apikey=${SCRAPIN_API_KEY}&linkedinUrl=${importLinkedinDto.linkedinURL}`;
    const linkedinRes = await this.httpService.axiosRef.get(linkedinScrapeURL);

    const resume = scrapinToResume(linkedinRes.data);
    const randomTitle = generateRandomName() + " (LinkedIn)";

    const data = deepmerge(defaultResumeData, {
      basics: resume.basics,
      sections: resume.sections,
    } satisfies DeepPartial<ResumeData>);

    return this.prisma.resume.create({
      data: {
        userId,
        visibility: "private",
        data,
        title: randomTitle,
        slug: kebabCase(randomTitle),
      },
    });
  }

  findAll(userId: string) {
    return this.prisma.resume.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } });
  }

  findOne(id: string, userId?: string) {
    if (userId) {
      return this.prisma.resume.findUniqueOrThrow({ where: { userId_id: { userId, id } } });
    }

    return this.prisma.resume.findUniqueOrThrow({ where: { id } });
  }

  async findOneStatistics(id: string) {
    const result = await this.prisma.statistics.findFirst({
      select: { views: true, downloads: true },
      where: { resumeId: id },
    });

    return {
      views: result?.views ?? 0,
      downloads: result?.downloads ?? 0,
    };
  }

  async findOneByUsernameSlug(username: string, slug: string, userId?: string) {
    const resume = await this.prisma.resume.findFirstOrThrow({
      where: { user: { username }, slug, visibility: "public" },
    });

    // Update statistics: increment the number of views by 1
    if (!userId) {
      await this.prisma.statistics.upsert({
        where: { resumeId: resume.id },
        create: { views: 1, downloads: 0, resumeId: resume.id },
        update: { views: { increment: 1 } },
      });
    }

    return resume;
  }

  async update(userId: string, id: string, updateResumeDto: UpdateResumeDto) {
    try {
      const { locked } = await this.prisma.resume.findUniqueOrThrow({
        where: { id },
        select: { locked: true },
      });

      if (locked) throw new BadRequestException(ErrorMessage.ResumeLocked);

      return await this.prisma.resume.update({
        data: {
          title: updateResumeDto.title,
          slug: updateResumeDto.slug,
          visibility: updateResumeDto.visibility,
          data: updateResumeDto.data as unknown as Prisma.JsonObject,
        },
        where: { userId_id: { userId, id } },
      });
    } catch (error) {
      if (error.code === "P2025") {
        Logger.error(error);
        throw new InternalServerErrorException(error);
      }
    }
  }

  lock(userId: string, id: string, set: boolean) {
    return this.prisma.resume.update({
      data: { locked: set },
      where: { userId_id: { userId, id } },
    });
  }

  async remove(userId: string, id: string) {
    await Promise.all([
      // Remove files in storage, and their cached keys
      this.storageService.deleteObject(userId, "resumes", id),
      this.storageService.deleteObject(userId, "previews", id),
    ]);

    return this.prisma.resume.delete({ where: { userId_id: { userId, id } } });
  }

  async printResume(resume: ResumeDto, userId?: string) {
    const url = await this.printerService.printResume(resume);

    // Update statistics: increment the number of downloads by 1
    if (!userId) {
      await this.prisma.statistics.upsert({
        where: { resumeId: resume.id },
        create: { views: 0, downloads: 1, resumeId: resume.id },
        update: { downloads: { increment: 1 } },
      });
    }

    return url;
  }

  printPreview(resume: ResumeDto) {
    return this.printerService.printPreview(resume);
  }
}

async function fileToResume(mimetype: "pdf" | "png" | "jpg" | "jpeg", base64: string) {
  if (!["pdf", "png", "jpg", "jpeg"].includes(mimetype)) {
    throw new BadRequestException(ErrorMessage.InvalidFileType);
  }

  let result;

  if (mimetype === "pdf") {
    const buffer = Buffer.from(base64, "base64");
    result = await generateText({
      model: anthropic("claude-3-5-sonnet-20241022"),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Create a resume from the file." },
            { type: "file", data: buffer, mimeType: "application/pdf" },
          ],
        },
      ],
    });
  }

  if (mimetype === "png" || mimetype === "jpg" || mimetype === "jpeg") {
    result = await generateText({
      model: anthropic("claude-3-5-sonnet-20241022"),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Create a resume from the file." },
            { type: "image", image: base64 },
          ],
        },
      ],
    });
  }

  if (!result) throw new BadRequestException(ErrorMessage.InvalidFileType);

  const basicsResult = generateObject({
    prompt: `given the free text result, extract the basics, summary and languages: ${result.text}`,
    model: openai("gpt-4o"),
    schema: z.object({
      name: z.string(),
      lastName: z.string(),
      email: z.string().email(),
      phone: z.string(),
      location: z.string(),
      headline: z.string(),
      summary: z.string(),
      languages: z.array(z.string()),
    }),
  });

  const experiencesResult = generateObject({
    prompt: `given the free text result, extract the experiences: ${result.text}`,
    model: openai("gpt-4o"),
    schema: z.object({
      experiences: z.array(
        z.object({
          company: z.string().min(1),
          position: z.string(),
          location: z.string(),
          date: z.string(),
          summary: z.string(),
        }),
      ),
    }),
  });

  const skillsResult = generateObject({
    prompt: `given the free text result, extract the skills: ${result.text}`,
    model: openai("gpt-4o"),
    schema: z.object({
      skills: z.array(
        z.object({
          name: z.string(),
          description: z.string(),
        }),
      ),
    }),
  });

  const educationsResult = generateObject({
    prompt: `given the free text result, extract the educations: ${result.text}`,
    model: openai("gpt-4o"),
    schema: z.object({
      educations: z.array(
        z.object({
          institution: z.string().min(1),
          studyType: z.string(),
          area: z.string(),
          score: z.string(),
          date: z.string(),
          summary: z.string(),
        }),
      ),
    }),
  });

  const allResults = await Promise.all([
    basicsResult,
    experiencesResult,
    skillsResult,
    educationsResult,
  ]);

  const basics = allResults[0].object;
  const experiences = allResults[1].object.experiences;
  const skills = allResults[2].object.skills;
  const educations = allResults[3].object.educations;
  return { basics, experiences, skills, educations };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rawToResume(results: any) {
  const rawBasics = results.basics;
  const rawLanguages = results.languages;
  const rawExperiences = results.experiences;
  const rawSkills = results.skills;
  const rawEducations = results.educations;
  const rawSummary = results.summary;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const skills: Skill[] = rawSkills.map((skill: any) => {
    return {
      id: createId(),
      visible: true,
      name: skill.name ?? defaultSkill.name,
      description: skill.description ?? defaultSkill.description,
      level: skill.level ?? 0,
      keywords: skill.keywords ?? defaultSkill.keywords,
    };
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const experiences: Experience[] = rawExperiences.map((experience: any) => {
    return {
      id: createId(),
      visible: true,
      company: experience.company ?? defaultExperience.company,
      position: experience.position ?? defaultExperience.position,
      location: experience.location ?? defaultExperience.location,
      date: experience.date ?? defaultExperience.date,
      summary: experience.summary ?? defaultExperience.summary,
      url: defaultUrl,
    };
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const educations: Education[] = rawEducations.map((education: any) => {
    return {
      id: createId(),
      visible: true,
      institution: education.institution ?? defaultEducation.institution,
      studyType: education.studyType ?? defaultEducation.studyType,
      area: education.area ?? defaultEducation.area,
      score: education.score ?? defaultEducation.score,
      date: education.date ?? defaultEducation.date,
      summary: education.summary ?? defaultEducation.summary,
      url: defaultUrl,
    };
  });

  const basics: Basics = {
    name: rawBasics.name ?? defaultBasics.name,
    headline: rawBasics.headline ?? defaultBasics.headline,
    email: rawBasics.email ?? defaultBasics.email,
    phone: rawBasics.phone ?? defaultBasics.phone,
    location: rawBasics.location ?? defaultBasics.location,
    url: defaultUrl,
    customFields: [],
    picture: defaultBasics.picture,
  };

  const languages: Language[] = rawLanguages.map((language: string) => {
    return {
      id: createId(),
      name: language,
      description: "",
      level: 0,
    };
  });

  const sections: Sections = {
    summary: {
      ...defaultSection,
      id: "summary",
      name: "Summary",
      content: rawSummary ?? defaultResumeData.sections.summary.content,
    },
    education: {
      ...defaultSection,
      id: "education",
      name: "Education",
      items: educations,
    },
    experience: {
      ...defaultSection,
      id: "experience",
      name: "Experience",
      items: experiences,
    },
    skills: {
      ...defaultSection,
      id: "skills",
      name: "Skills",
      items: skills,
    },
    languages: {
      ...defaultSection,
      id: "languages",
      name: "Languages",
      items: languages,
    },
    profiles: {
      ...defaultSection,
      id: "profiles",
      name: "Profiles",
      items: [],
    },

    volunteer: { ...defaultSection, id: "volunteer", name: "Volunteering", items: [] },
    interests: { ...defaultSection, id: "interests", name: "Interests", items: [] },
    projects: { ...defaultSection, id: "projects", name: "Projects", items: [] },
    publications: { ...defaultSection, id: "publications", name: "Publications", items: [] },
    references: { ...defaultSection, id: "references", name: "References", items: [] },
    awards: { ...defaultSection, id: "awards", name: "Awards", items: [] },
    certifications: { ...defaultSection, id: "certifications", name: "Certifications", items: [] },
    custom: {},
  };

  return { basics, sections };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function scrapinToResume(scrapin: any) {
  const person = scrapin.person;
  const fullName = `${person.firstName} ${person.lastName}`;
  const headline = person.headline ?? "";
  const location = person.location ?? "";
  const pictureUrl = person.photoUrl ?? "";
  const summary = person.summary ?? "";

  const skills = person.skills.map((skill: string) => {
    return {
      id: createId(),
      visible: true,
      name: skill,
      description: "",
      level: 0,
      keywords: [],
    };
  });

  const languages = person.languages.map((lang: string) => {
    return {
      id: createId(),
      visible: true,
      name: lang,
      description: "",
      level: 0,
    };
  });

  const profile = {
    id: createId(),
    visible: true,
    network: "LinkedIn",
    username: person.publicIdentifier,
    icon: "linkedin",
    url: {
      label: "",
      href: person.linkedInUrl,
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const experiences = person.positions.positionHistory.map((position: any) => {
    const date = formatDateRange(position.startEndDated);

    return {
      id: createId(),
      visible: true,
      company: position.companyName ?? "",
      position: position.title ?? "",
      location: "",
      date: date,
      summary: position.description ?? "",
      url: {
        label: "",
        href: position.linkedInUrl ?? "",
      },
    };
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const educations = person.schools.educationHistory.map((school: any) => {
    const date = formatDateRange(school.startEndDated);

    return {
      id: createId(),
      visible: true,
      institution: school.schoolName ?? "",
      studyType: school.fieldOfStudy ?? "",
      area: "",
      score: "",
      date: date,
      summary: school.degreeName ?? "",
      url: {
        label: "",
        href: school.linkedInUrl ?? "",
      },
    };
  });

  const basics: Basics = {
    name: fullName,
    headline: headline,
    email: "",
    phone: "",
    location: location,
    url: defaultUrl,
    customFields: [],
    picture: {
      url: pictureUrl,
      size: 64,
      aspectRatio: 1,
      borderRadius: 0,
      effects: {
        hidden: false,
        border: false,
        grayscale: false,
      },
    },
  };

  const sections: Sections = {
    summary: {
      ...defaultSection,
      id: "summary",
      name: "Summary",
      content: summary,
    },
    education: {
      ...defaultSection,
      id: "education",
      name: "Education",
      items: educations,
    },
    experience: {
      ...defaultSection,
      id: "experience",
      name: "Experience",
      items: experiences,
    },
    skills: {
      ...defaultSection,
      id: "skills",
      name: "Skills",
      items: skills,
    },
    languages: {
      ...defaultSection,
      id: "languages",
      name: "Languages",
      items: languages,
    },
    profiles: {
      ...defaultSection,
      id: "profiles",
      name: "Profiles",
      items: [profile],
    },

    volunteer: { ...defaultSection, id: "volunteer", name: "Volunteering", items: [] },
    interests: { ...defaultSection, id: "interests", name: "Interests", items: [] },
    projects: { ...defaultSection, id: "projects", name: "Projects", items: [] },
    publications: { ...defaultSection, id: "publications", name: "Publications", items: [] },
    references: { ...defaultSection, id: "references", name: "References", items: [] },
    awards: { ...defaultSection, id: "awards", name: "Awards", items: [] },
    certifications: { ...defaultSection, id: "certifications", name: "Certifications", items: [] },
    custom: {},
  };

  return {
    basics,
    sections,
  };
}

function formatDateRange(startEndDate?: {
  start?: { month: number; year: number };
  end?: { month: number; year: number };
}): string {
  if (!startEndDate) return "";

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const { start, end } = startEndDate;

  const formatMonthYear = (date: { month: number; year: number }) => {
    return `${monthNames[date.month - 1]} ${date.year}`;
  };

  if (start && end) {
    return `${formatMonthYear(start)} to ${formatMonthYear(end)}`;
  } else if (start) {
    return `Since ${formatMonthYear(start)}`;
  } else if (end) {
    return `Until ${formatMonthYear(end)}`;
  } else {
    return "";
  }
}
