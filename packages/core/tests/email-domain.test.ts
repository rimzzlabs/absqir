import { describe, expect, it } from "vitest";
import {
  claimableDomainOfEmail,
  emailDomainOf,
  isClaimableDomain,
  isPublicEmailDomain,
  normalizeDomain,
} from "@/email-domain";

describe("normalizeDomain", () => {
  it("keeps one spelling for the same domain", () => {
    expect(normalizeDomain("Kolosal.AI")).toBe("kolosal.ai");
    expect(normalizeDomain("  kolosal.ai  ")).toBe("kolosal.ai");
    expect(normalizeDomain("kolosal.ai.")).toBe("kolosal.ai");
    expect(normalizeDomain("@kolosal.ai")).toBe("kolosal.ai");
    expect(normalizeDomain("https://kolosal.ai/team")).toBe("kolosal.ai");
  });

  it("refuses what is not a domain name", () => {
    expect(normalizeDomain("")).toBeNull();
    expect(normalizeDomain("localhost")).toBeNull();
    expect(normalizeDomain("192.168.0.1")).toBeNull();
    expect(normalizeDomain("kolosal..ai")).toBeNull();
    expect(normalizeDomain("-kolosal.ai")).toBeNull();
    expect(normalizeDomain("kolosal.ai-")).toBeNull();
    expect(normalizeDomain("kolo sal.ai")).toBeNull();
    expect(normalizeDomain(`${"a".repeat(250)}.example.com`)).toBeNull();
  });
});

describe("emailDomainOf", () => {
  it("reads the domain part", () => {
    expect(emailDomainOf("Rizki@Kolosal.AI")).toBe("kolosal.ai");
    expect(emailDomainOf(" rizki@kolosal.ai ")).toBe("kolosal.ai");
  });

  it("returns null when there is no address", () => {
    expect(emailDomainOf("rizki")).toBeNull();
    expect(emailDomainOf("@kolosal.ai")).toBeNull();
    expect(emailDomainOf("rizki@")).toBeNull();
    expect(emailDomainOf("rizki@localhost")).toBeNull();
  });
});

describe("public domains", () => {
  it("knows the mailbox providers people sign up with", () => {
    expect(isPublicEmailDomain("proton.me")).toBe(true);
    expect(isPublicEmailDomain("Gmail.com")).toBe(true);
    expect(isPublicEmailDomain("outlook.com")).toBe(true);
    expect(isPublicEmailDomain("mailinator.com")).toBe(true);
    expect(isPublicEmailDomain("kolosal.ai")).toBe(false);
  });

  it("never lets an organization claim one", () => {
    expect(isClaimableDomain("proton.me")).toBe(false);
    expect(isClaimableDomain("gmail.com")).toBe(false);
    expect(isClaimableDomain("kolosal.ai")).toBe(true);
    expect(isClaimableDomain("not a domain")).toBe(false);
  });
});

describe("claimableDomainOfEmail", () => {
  it("names the workspace domain of a work address", () => {
    expect(claimableDomainOfEmail("rizki@kolosal.ai")).toBe("kolosal.ai");
  });

  it("names nothing for a personal address", () => {
    expect(claimableDomainOfEmail("rimzzlabs@proton.me")).toBeNull();
    expect(claimableDomainOfEmail("someone@gmail.com")).toBeNull();
  });

  it("keeps a subdomain apart from the domain that claimed it", () => {
    expect(claimableDomainOfEmail("rizki@mail.kolosal.ai")).toBe("mail.kolosal.ai");
  });
});
