export const ITEM_TYPES = ["Event", "Task", "Reminder", "Milestone", "Meeting", "Other"];
export const STATUSES = ["not_started", "in_progress", "completed", "cancelled"];
export const REMINDER_OPTIONS = [
  { value: 1, label: "1 day in advance" },
  { value: 3, label: "3 days in advance" },
  { value: 5, label: "5 days in advance" },
  { value: 10, label: "10 days in advance" }
];
export const CURRENCIES = ["ILS", "USD", "EUR", "GBP"];
export const STATUS_LABELS = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled"
};
export const STATUS_COLORS = {
  not_started: "#f39c12",
  in_progress: "#3498db",
  completed: "#27ae60",
  cancelled: "#95a5a6"
};
export const ITEM_TYPE_COLORS = {
  Event: "#e74c3c",
  Task: "#3498db",
  Reminder: "#9b59b6",
  Milestone: "#f39c12",
  Meeting: "#1abc9c",
  Other: "#95a5a6"
};
export const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString + "T00:00:00Z");
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};
export const formatCurrency = (amount, currency = "ILS") => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency
  }).format(amount);
};
export const getStatusLabel = (status) => STATUS_LABELS[status] || status;
export const isOverdue = (endDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDate + "T00:00:00Z");
  return end < today;
};
export const isToday = (dateString) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateString + "T00:00:00Z");
  return date.getTime() === today.getTime();
};
export const daysUntilStart = (startDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDate + "T00:00:00Z");
  const diffTime = start - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};