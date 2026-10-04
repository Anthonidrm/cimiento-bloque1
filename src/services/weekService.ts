import { weeks, getWeek } from "../data/weeks";
import { modules } from "../data/modules";
import type { WeekGuide } from "../data/weekTypes";

export function getAllWeeks(): WeekGuide[] {
  return weeks;
}

export function getWeekByNumber(week: number): WeekGuide | undefined {
  return getWeek(week);
}

export function getAdjacentWeeks(week: number): {
  prev: WeekGuide | undefined;
  next: WeekGuide | undefined;
} {
  return { prev: getWeek(week - 1), next: getWeek(week + 1) };
}

export function getModules() {
  return modules;
}

export function getWeeksForModule(moduleId: number): WeekGuide[] {
  return weeks.filter((w) => w.module === moduleId);
}
