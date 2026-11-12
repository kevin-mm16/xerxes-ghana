import AppLink from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import { cn } from "@/utils/cn";
import { Icon } from "./Icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
}
const variants = {
  primary: "ui-button--primary",
  secondary: "ui-button--secondary",
  ghost: "ui-button--ghost",
  danger: "ui-button--danger",
};
export function buttonStyles({
  variant = "primary",
  size = "md",
  className,
}: Pick<ButtonProps, "variant" | "size" | "className"> = {}) {
  return cn(
    "ui-button",
    variants[variant],
    size === "sm" && "ui-button--small",
    className,
  );
}
export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonStyles({ variant, size, className })}
      {...props}
    />
  );
}
export function IconButton({
  icon,
  label,
  className,
  variant = "ghost",
  ...props
}: ButtonProps & { icon: string; label: string }) {
  return (
    <Button
      variant={variant}
      aria-label={label}
      title={label}
      className={cn("ui-icon-button", className)}
      {...props}
    >
      <Icon name={icon} />
    </Button>
  );
}
export function LinkButton({
  variant,
  size,
  className,
  href,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> &
  Pick<ButtonProps, "variant" | "size"> & { href: string }) {
  return (
    <AppLink
      href={href}
      className={buttonStyles({ variant, size, className })}
      {...props}
    />
  );
}
