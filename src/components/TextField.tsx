import type { ComponentPropsWithoutRef, ReactElement } from 'react';
import { useId } from 'react';
export interface TextFieldProps extends ComponentPropsWithoutRef<'input'> { label: string; }
export function TextField({ label, id, ...props }: TextFieldProps): ReactElement {
  const generatedId: string = useId();
  const fieldId: string = id ?? generatedId;
  return <div className="text-field">
    <label htmlFor={fieldId}>{label}</label>
    <input id={fieldId} {...props} />
  </div>;
}
