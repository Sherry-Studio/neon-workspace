"use client";

import { PageHeader } from "@/components/ui/misc";
import { BlogForm } from "@/components/forms/blog-form";

export default function NewBlogPage() {
  return (
    <>
      <PageHeader title="New post" description="Write an article for The Vault." />
      <BlogForm />
    </>
  );
}
