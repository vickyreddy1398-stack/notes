import { expect, test } from "@playwright/test";

test("a person can sign up and see the authenticated result", async ({ page, context }) => {
  await page.goto("/");
  await page.getByLabel("Email").fill(`person-${Date.now()}@example.com`);
  await page.getByLabel("Password").fill("secret");
  const signUpResponse = page.waitForResponse((response) =>
    response.url().includes("/api/trpc/users.signUp"),
  );
  await page.getByRole("button", { name: "Sign up" }).click();
  const responseBody = await (await signUpResponse).json();
  expect(responseBody[0]?.result?.data?.session).not.toHaveProperty("token");
  await expect(page.getByRole("status")).toContainText("Your account is ready");
  await expect
    .poll(async () => (await context.cookies()).some((cookie) => cookie.name === "session_token"))
    .toBe(true);
});
