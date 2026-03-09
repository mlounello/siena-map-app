import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`rounded-md border px-3 py-2 text-sm ${props.className ?? ''}`.trim()} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`rounded-md border px-3 py-2 text-sm ${props.className ?? ''}`.trim()} />;
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`rounded-md border px-3 py-2 text-sm ${props.className ?? ''}`.trim()} />;
}
