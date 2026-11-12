"use client";

import {
  cloneElement,
  forwardRef,
  isValidElement,
  useId,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/utils/cn";

export function Field({
  label,
  help,
  error,
  id,
  children,
  required,
  className,
}: {
  label: string;
  help?: ReactNode;
  error?: string;
  id?: string;
  children: ReactNode;
  required?: boolean;
  className?: string;
}) {
  const generated = useId();
  const child = isValidElement(children)
    ? (children as ReactElement<InputHTMLAttributes<HTMLInputElement>>)
    : undefined;
  const fieldId = id ?? child?.props.id ?? generated;
  const describedBy =
    [
      child?.props["aria-describedby"],
      error ? `${fieldId}-error` : help ? `${fieldId}-help` : undefined,
    ]
      .filter(Boolean)
      .join(" ") || undefined;
  const control = child
    ? cloneElement(child, {
        id: fieldId,
        "aria-invalid": error ? true : child.props["aria-invalid"],
        "aria-describedby": describedBy,
      })
    : children;
  return (
    <div className={cn("ui-field", className)}>
      <label className="ui-field-label" htmlFor={fieldId}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      {control}
      {help && !error && (
        <p id={`${fieldId}-help`} className="ui-field-help">
          {help}
        </p>
      )}
      {error && (
        <p id={`${fieldId}-error`} role="alert" className="ui-field-error">
          {error}
        </p>
      )}
    </div>
  );
}
export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn("ui-input", className)} {...props} />;
});
export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cn("ui-input", className)} {...props}>
      {children}
    </select>
  );
});
export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn("ui-input ui-textarea", className)}
      {...props}
    />
  );
});
export function FormHelp({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("ui-field-help", className)} {...props} />;
}
