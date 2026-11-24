/** Marks a form field as required. Screen readers get the field's own `required`/`aria-required`. */
export function RequiredMark() {
  return <span className="required-mark" aria-hidden="true"> *</span>;
}
