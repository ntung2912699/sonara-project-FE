export function messageOf(error) {
  const fieldMessage = Object.values(error?.errors || {}).flat().find(Boolean);
  return fieldMessage || error?.message || 'Something went wrong. Please try again.';
}
