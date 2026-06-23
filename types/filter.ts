export interface FilterOption {
  name: string;
  matrix: number[];
}

// Reuse your same filters array:
export const filterOptions: FilterOption[] = [
  {
    name: 'Normal',
    matrix: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0],
  },
  {
    name: 'Sepia',
    matrix: [
      0.393, 0.769, 0.189, 0, 0, 0.349, 0.686, 0.168, 0, 0, 0.272, 0.534, 0.131,
      0, 0, 0, 0, 0, 1, 0,
    ],
  },
  {
    name: 'Grayscale',
    matrix: [
      0.299, 0.587, 0.114, 0, 0, 0.299, 0.587, 0.114, 0, 0, 0.299, 0.587, 0.114,
      0, 0, 0, 0, 0, 1, 0,
    ],
  },
  {
    name: 'High Contrast',
    matrix: [
      2, -0.5, -0.5, 0, 0, -0.5, 2, -0.5, 0, 0, -0.5, -0.5, 2, 0, 0, 0, 0, 0, 1,
      0,
    ],
  },
  {
    name: 'Invert',
    matrix: [-1, 0, 0, 0, 1, 0, -1, 0, 0, 1, 0, 0, -1, 0, 1, 0, 0, 0, 1, 0],
  },
  {
    name: 'Vintage',
    matrix: [
      0.6, 0.3, 0.1, 0, 0, 0.2, 0.7, 0.1, 0, 0, 0.2, 0.3, 0.5, 0, 0, 0, 0, 0, 1,
      0,
    ],
  },
  {
    name: 'Cool',
    matrix: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1.2, 0, 0, 0, 0, 0, 1, 0],
  },
  {
    name: 'Warm',
    matrix: [1.2, 0, 0, 0, 0, 0, 1.1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0],
  },
  {
    name: 'Saturate',
    matrix: [
      1.3, -0.3, -0.3, 0, 0, -0.3, 1.3, -0.3, 0, 0, -0.3, -0.3, 1.3, 0, 0, 0, 0,
      0, 1, 0,
    ],
  },
  {
    name: 'Desaturate',
    matrix: [
      0.7, 0.3, 0.3, 0, 0, 0.3, 0.7, 0.3, 0, 0, 0.3, 0.3, 0.7, 0, 0, 0, 0, 0, 1,
      0,
    ],
  },
];

export function getFilterMatrixByName(name: string): number[] | null {
  const found = filterOptions.find((f) => f.name === name);
  return found ? found.matrix : null;
}
