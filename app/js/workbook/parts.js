// All parts of the workbook, grouped by the exercise they belong to. The order is the order of the course.
// A group is { id, title, about, demo, parts }: demo is the interactive page of that exercise, if there is one.
import { zak } from './zak.js';
import { pump } from './pump.js';
import { chern } from './chern.js';

export const GROUPS = [
  { id: 'ex3', title: 'Exercise 3', about: 'the SSH chain in k-space', demo: 'exercise3.html', parts: [zak] },
  { id: 'ex4', title: 'Exercise 4', about: 'Thouless pump and Chern number', demo: null, parts: [pump, chern] },
];
export const PARTS = GROUPS.flatMap((g) => g.parts);
export const groupOf = (part) => GROUPS.find((g) => g.parts.includes(part));
export const questions = (part) => part.steps.filter((s) => s.type !== 'info').length;
export const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
