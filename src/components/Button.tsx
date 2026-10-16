import type { ComponentPropsWithoutRef, ReactElement } from 'react';
export type ButtonProps = ComponentPropsWithoutRef<'button'>;
export function Button({ type = 'button', ...props }: ButtonProps): ReactElement {
  return <button type={type} {...props} />;
}
