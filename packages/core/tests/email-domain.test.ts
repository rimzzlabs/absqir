import { describe, expect, it } from "vitest";
import {
  claimableDomainOfEmail,
  emailDomainOf,
  isClaimableDomain,
  isPublicEmailDomain,
  normalizeDomain,
} from "#src/email-domain";

describe("normalizeDomain", () => {
  it("keeps one spelling for the same domain", () => {
    expect(normalizeDomain("Example.COM")).toBe("example.com");
    expect(normalizeDomain("  example.com  ")).toBe("example.com");
    expect(normalizeDomain("example.com.")).toBe("example.com");
    expect(normalizeDomain("@example.com")).toBe("example.com");
    expect(normalizeDomain("https://example.com/team")).toBe("example.com");
  });

  it("refuses what is not a domain name", () => {
    expect(normalizeDomain("")).toBeNull();
    expect(normalizeDomain("localhost")).toBeNull();
    expect(normalizeDomain("192.168.0.1")).toBeNull();
    expect(normalizeDomain("example..com")).toBeNull();
    expect(normalizeDomain("-example.com")).toBeNull();
    expect(normalizeDomain("example.com-")).toBeNull();
    expect(normalizeDomain("exam ple.com")).toBeNull();
    expect(normalizeDomain(`${"a".repeat(250)}.example.com`)).toBeNull();
  });
});

describe("emailDomainOf", () => {
  it("reads the domain part", () => {
    expect(emailDomainOf("Ada@Example.COM")).toBe("example.com");
    expect(emailDomainOf(" ada@example.com ")).toBe("example.com");
  });

  it("returns null when there is no address", () => {
    expect(emailDomainOf("ada")).toBeNull();
    expect(emailDomainOf("@example.com")).toBeNull();
    expect(emailDomainOf("ada@")).toBeNull();
    expect(emailDomainOf("ada@localhost")).toBeNull();
  });
});

describe("public domains", () => {
  it("knows the mailbox providers people sign up with", () => {
    expect(isPublicEmailDomain("proton.me")).toBe(true);
    expect(isPublicEmailDomain("Gmail.com")).toBe(true);
    expect(isPublicEmailDomain("outlook.com")).toBe(true);
    expect(isPublicEmailDomain("mailinator.com")).toBe(true);
    expect(isPublicEmailDomain("example.com")).toBe(false);
  });

  it("never lets an organization claim one", () => {
    expect(isClaimableDomain("proton.me")).toBe(false);
    expect(isClaimableDomain("gmail.com")).toBe(false);
    expect(isClaimableDomain("example.com")).toBe(true);
    expect(isClaimableDomain("not a domain")).toBe(false);
  });
});

describe("claimableDomainOfEmail", () => {
  it("names the workspace domain of a work address", () => {
    expect(claimableDomainOfEmail("ada@example.com")).toBe("example.com");
  });

  it("names nothing for a personal address", () => {
    expect(claimableDomainOfEmail("ada@proton.me")).toBeNull();
    expect(claimableDomainOfEmail("someone@gmail.com")).toBeNull();
  });

  it("keeps a subdomain apart from the domain that claimed it", () => {
    expect(claimableDomainOfEmail("ada@mail.example.com")).toBe("mail.example.com");
  });
});
