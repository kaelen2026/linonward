"use client";

import { SignOut } from "@/components/auth/sign-out";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

export function getUserInitials(name: string, email: string) {
  const label = name.trim() || email.split("@")[0] || email;
  const words = label.split(/\s+/).filter(Boolean);

  if (words.length > 1) {
    return `${Array.from(words[0] ?? "")[0] ?? ""}${Array.from(words[1] ?? "")[0] ?? ""}`.toUpperCase();
  }

  return (Array.from(label)[0] ?? "?").toUpperCase();
}

export function UserMenu({
  email,
  image,
  name,
  side = "right",
}: {
  email: string;
  image?: string | null;
  name: string;
  side?: "bottom" | "right";
}) {
  const initials = getUserInitials(name, email);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            aria-label="打开用户菜单"
            className="rounded-full"
            size="icon-lg"
            variant="ghost"
          />
        }
      >
        <Avatar size="lg">
          {image ? <AvatarImage alt={`${name} 的头像`} src={image} /> : null}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </PopoverTrigger>
      <PopoverContent align="end" side={side} sideOffset={8}>
        <PopoverHeader>
          <PopoverTitle>{name === email ? "当前用户" : name}</PopoverTitle>
          <PopoverDescription>{email}</PopoverDescription>
        </PopoverHeader>
        <Separator />
        <SignOut email={email} hideEmail />
      </PopoverContent>
    </Popover>
  );
}
