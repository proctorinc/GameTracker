export const ITEMIZED_SCORE_HELPERS = [
  "abs",
  "bonus_if_ge",
  "ceil",
  "floor",
  "if",
  "max",
  "min",
  "round",
] as const;

export type ItemizedScoreHelper = (typeof ITEMIZED_SCORE_HELPERS)[number];
export type ItemizedCategoryInputMode = "single" | "multi";

export type ItemizedCategoryInputDefinition = {
  key: string;
  label: string;
  defaultValue: number;
};

export type ItemizedCategoryDefinition = {
  id: string;
  name: string;
  optional: boolean;
  sortOrder: number;
  inputMode: ItemizedCategoryInputMode;
  inputs: ItemizedCategoryInputDefinition[];
  formula: string;
  helpText: string | null;
};

export type ItemizedScoreEntryValues = Record<string, number>;

type Token =
  | { type: "number"; value: number }
  | { type: "identifier"; value: string }
  | { type: "paren"; value: "(" | ")" }
  | { type: "comma" }
  | {
      type: "operator";
      value:
        | "+"
        | "-"
        | "*"
        | "/"
        | "%"
        | "<"
        | "<="
        | ">"
        | ">="
        | "=="
        | "!=";
    };

type ExpressionNode =
  | { type: "number"; value: number }
  | { type: "identifier"; value: string }
  | { type: "unary"; operator: "+" | "-"; argument: ExpressionNode }
  | {
      type: "binary";
      operator:
        | "+"
        | "-"
        | "*"
        | "/"
        | "%"
        | "<"
        | "<="
        | ">"
        | ">="
        | "=="
        | "!=";
      left: ExpressionNode;
      right: ExpressionNode;
    }
  | { type: "call"; name: ItemizedScoreHelper; args: ExpressionNode[] };

export type ItemizedFormulaPreview = {
  normalizedScore: number;
  rawScore: number;
};

export type ItemizedBreakdownLine = {
  categoryId: string;
  categoryName: string;
  formula: string;
  helpText: string | null;
  values: ItemizedScoreEntryValues;
  score: number;
};

export type ItemizedPlayerBreakdown = {
  userId: string;
  totalScore: number;
  lines: ItemizedBreakdownLine[];
};

export const ITEMIZED_SCORE_METADATA_PREFIX = "__";
export const ITEMIZED_SCORE_INCLUDED_METADATA_KEY = "__included";

export const DEFAULT_SINGLE_INPUT_KEY = "count";
export const DEFAULT_SINGLE_INPUT_LABEL = "Count";

function truncateFiniteNumber(value: number) {
  if (!Number.isFinite(value)) {
    throw new Error("Formula must produce a finite number");
  }

  return Math.trunc(value);
}

function normalizeIdentifierSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function normalizeItemizedInputKey(value: string, fallback: string) {
  const normalized = normalizeIdentifierSegment(value);
  const resolved = normalized || normalizeIdentifierSegment(fallback) || "value";

  return /^[a-z_]/.test(resolved) ? resolved : `v_${resolved}`;
}

export function normalizeItemizedCategoryKey(value: string, fallback: string) {
  return normalizeItemizedInputKey(value, fallback);
}

export function normalizeItemizedInputDefinition(
  input: Partial<ItemizedCategoryInputDefinition>,
  index: number,
): ItemizedCategoryInputDefinition | null {
  const label = (input.label ?? "").trim();

  if (!label) {
    return null;
  }

  return {
    key: normalizeItemizedInputKey(input.key ?? label, `value_${index + 1}`),
    label,
    defaultValue: truncateFiniteNumber(input.defaultValue ?? 0),
  };
}

export function buildLegacyItemizedCategory(input: {
  id: string;
  name: string;
  sortOrder: number;
  value: number;
}) {
  const normalizedValue = truncateFiniteNumber(input.value);

  return {
    id: input.id,
    name: input.name,
    optional: false,
    sortOrder: input.sortOrder,
    inputMode: "single" as const,
    inputs: [
      {
        key: DEFAULT_SINGLE_INPUT_KEY,
        label: DEFAULT_SINGLE_INPUT_LABEL,
        defaultValue: 0,
      },
    ],
    formula: `${DEFAULT_SINGLE_INPUT_KEY} * ${normalizedValue}`,
    helpText: null,
  };
}

export function buildDefaultItemizedValues(
  category: Pick<ItemizedCategoryDefinition, "inputs">,
): ItemizedScoreEntryValues {
  return Object.fromEntries(
    category.inputs.map((input) => [input.key, input.defaultValue]),
  );
}

export function normalizeItemizedValues(input: {
  category: Pick<ItemizedCategoryDefinition, "inputs">;
  values: Record<string, number | null | undefined> | null | undefined;
}) {
  const normalizedValues = buildDefaultItemizedValues(input.category);
  const rawValues = input.values ?? {};
  const allowedKeys = new Set(input.category.inputs.map((entry) => entry.key));

  for (const [key, value] of Object.entries(rawValues)) {
    if (key.startsWith(ITEMIZED_SCORE_METADATA_PREFIX)) {
      continue;
    }

    if (!allowedKeys.has(key)) {
      throw new Error(`Unknown score input "${key}"`);
    }

    normalizedValues[key] = truncateFiniteNumber(value ?? 0);
  }

  return normalizedValues;
}

export function extractItemizedMetadataValues(
  values: Record<string, number | null | undefined> | null | undefined,
) {
  const metadata: Record<string, number> = {};

  for (const [key, value] of Object.entries(values ?? {})) {
    if (!key.startsWith(ITEMIZED_SCORE_METADATA_PREFIX)) {
      continue;
    }

    metadata[key] = truncateFiniteNumber(value ?? 0);
  }

  return metadata;
}

function tokenizeFormula(expression: string): Token[] {
  const tokens: Token[] = [];
  let cursor = 0;

  while (cursor < expression.length) {
    const current = expression[cursor]!;

    if (/\s/.test(current)) {
      cursor += 1;
      continue;
    }

    if (/[0-9.]/.test(current)) {
      let end = cursor + 1;

      while (end < expression.length && /[0-9.]/.test(expression[end]!)) {
        end += 1;
      }

      const literal = expression.slice(cursor, end);

      if (!/^\d+(\.\d+)?$/.test(literal)) {
        throw new Error(`Invalid number "${literal}"`);
      }

      tokens.push({
        type: "number",
        value: Number(literal),
      });
      cursor = end;
      continue;
    }

    if (/[A-Za-z_]/.test(current)) {
      let end = cursor + 1;

      while (end < expression.length && /[A-Za-z0-9_]/.test(expression[end]!)) {
        end += 1;
      }

      tokens.push({
        type: "identifier",
        value: expression.slice(cursor, end),
      });
      cursor = end;
      continue;
    }

    if (current === "(" || current === ")") {
      tokens.push({ type: "paren", value: current });
      cursor += 1;
      continue;
    }

    if (current === ",") {
      tokens.push({ type: "comma" });
      cursor += 1;
      continue;
    }

    const next = expression[cursor + 1] ?? "";
    const twoCharacterOperator = `${current}${next}`;

    if (
      twoCharacterOperator === "<=" ||
      twoCharacterOperator === ">=" ||
      twoCharacterOperator === "==" ||
      twoCharacterOperator === "!="
    ) {
      tokens.push({
        type: "operator",
        value: twoCharacterOperator,
      });
      cursor += 2;
      continue;
    }

    if (
      current === "+" ||
      current === "-" ||
      current === "*" ||
      current === "/" ||
      current === "%" ||
      current === "<" ||
      current === ">"
    ) {
      tokens.push({
        type: "operator",
        value: current,
      });
      cursor += 1;
      continue;
    }

    throw new Error(`Unsupported character "${current}" in formula`);
  }

  return tokens;
}

function parseExpression(tokens: Token[]) {
  let cursor = 0;

  function readCurrent() {
    return tokens[cursor] ?? null;
  }

  function consume() {
    const token = tokens[cursor] ?? null;
    cursor += 1;
    return token;
  }

  function parsePrimary(): ExpressionNode {
    const current = readCurrent();

    if (!current) {
      throw new Error("Unexpected end of formula");
    }

    if (current.type === "number") {
      consume();
      return { type: "number", value: current.value };
    }

    if (current.type === "identifier") {
      consume();
      const next = readCurrent();

      if (next?.type === "paren" && next.value === "(") {
        consume();
        const args: ExpressionNode[] = [];
        const nextToken = readCurrent();

        if (!(nextToken?.type === "paren" && nextToken.value === ")")) {
          while (true) {
            args.push(parseComparison());

            const separator = readCurrent();

            if (separator?.type === "comma") {
              consume();
              continue;
            }

            break;
          }
        }

        const close = consume();

        if (close?.type !== "paren" || close.value !== ")") {
          throw new Error(`Missing closing ")" for ${current.value}`);
        }

        if (!ITEMIZED_SCORE_HELPERS.includes(current.value as ItemizedScoreHelper)) {
          throw new Error(`Unknown helper "${current.value}"`);
        }

        return {
          type: "call",
          name: current.value as ItemizedScoreHelper,
          args,
        };
      }

      return { type: "identifier", value: current.value };
    }

    if (current.type === "paren" && current.value === "(") {
      consume();
      const node = parseComparison();
      const close = consume();

      if (close?.type !== "paren" || close.value !== ")") {
        throw new Error('Missing closing ")"');
      }

      return node;
    }

    throw new Error("Unexpected token in formula");
  }

  function parseUnary(): ExpressionNode {
    const current = readCurrent();

    if (current?.type === "operator" && (current.value === "+" || current.value === "-")) {
      consume();
      return {
        type: "unary",
        operator: current.value,
        argument: parseUnary(),
      };
    }

    return parsePrimary();
  }

  function parseMultiplicative(): ExpressionNode {
    let node = parseUnary();

    while (true) {
      const current = readCurrent();

      if (
        current?.type === "operator" &&
        (current.value === "*" || current.value === "/" || current.value === "%")
      ) {
        consume();
        node = {
          type: "binary",
          operator: current.value,
          left: node,
          right: parseUnary(),
        };
        continue;
      }

      return node;
    }
  }

  function parseAdditive(): ExpressionNode {
    let node = parseMultiplicative();

    while (true) {
      const current = readCurrent();

      if (
        current?.type === "operator" &&
        (current.value === "+" || current.value === "-")
      ) {
        consume();
        node = {
          type: "binary",
          operator: current.value,
          left: node,
          right: parseMultiplicative(),
        };
        continue;
      }

      return node;
    }
  }

  function parseComparison(): ExpressionNode {
    let node = parseAdditive();

    while (true) {
      const current = readCurrent();

      if (
        current?.type === "operator" &&
        (current.value === "<" ||
          current.value === "<=" ||
          current.value === ">" ||
          current.value === ">=" ||
          current.value === "==" ||
          current.value === "!=")
      ) {
        consume();
        node = {
          type: "binary",
          operator: current.value,
          left: node,
          right: parseAdditive(),
        };
        continue;
      }

      return node;
    }
  }

  const node = parseComparison();

  if (cursor < tokens.length) {
    throw new Error("Unexpected token at end of formula");
  }

  return node;
}

function validateExpressionNode(
  node: ExpressionNode,
  allowedIdentifiers: Set<string>,
) {
  switch (node.type) {
    case "number":
      return;
    case "identifier":
      if (!allowedIdentifiers.has(node.value)) {
        throw new Error(`Unknown input "${node.value}"`);
      }
      return;
    case "unary":
      validateExpressionNode(node.argument, allowedIdentifiers);
      return;
    case "binary":
      validateExpressionNode(node.left, allowedIdentifiers);
      validateExpressionNode(node.right, allowedIdentifiers);
      return;
    case "call":
      for (const argument of node.args) {
        validateExpressionNode(argument, allowedIdentifiers);
      }
      return;
  }
}

function evaluateExpressionNode(
  node: ExpressionNode,
  values: Record<string, number>,
): number {
  switch (node.type) {
    case "number":
      return node.value;
    case "identifier":
      return values[node.value] ?? 0;
    case "unary": {
      const operand = evaluateExpressionNode(node.argument, values);
      return node.operator === "-" ? operand * -1 : operand;
    }
    case "binary": {
      const left = evaluateExpressionNode(node.left, values);
      const right = evaluateExpressionNode(node.right, values);

      switch (node.operator) {
        case "+":
          return left + right;
        case "-":
          return left - right;
        case "*":
          return left * right;
        case "/":
          if (right === 0) {
            throw new Error("Formula cannot divide by zero");
          }

          return left / right;
        case "%":
          if (right === 0) {
            throw new Error("Formula cannot modulo by zero");
          }

          return left % right;
        case "<":
          return left < right ? 1 : 0;
        case "<=":
          return left <= right ? 1 : 0;
        case ">":
          return left > right ? 1 : 0;
        case ">=":
          return left >= right ? 1 : 0;
        case "==":
          return left === right ? 1 : 0;
        case "!=":
          return left !== right ? 1 : 0;
      }
    }
    case "call": {
      const args = node.args.map((argument) =>
        evaluateExpressionNode(argument, values),
      );

      switch (node.name) {
        case "abs":
          return Math.abs(args[0] ?? 0);
        case "bonus_if_ge":
          if (args.length < 3) {
            throw new Error("bonus_if_ge requires value, threshold, and bonus");
          }

          return (args[0] ?? 0) >= (args[1] ?? 0) ? (args[2] ?? 0) : 0;
        case "ceil":
          return Math.ceil(args[0] ?? 0);
        case "floor":
          return Math.floor(args[0] ?? 0);
        case "if":
          if (args.length < 3) {
            throw new Error("if requires condition, true value, and false value");
          }

          return (args[0] ?? 0) !== 0 ? (args[1] ?? 0) : (args[2] ?? 0);
        case "max":
          if (args.length === 0) {
            throw new Error("max requires at least one argument");
          }

          return Math.max(...args);
        case "min":
          if (args.length === 0) {
            throw new Error("min requires at least one argument");
          }

          return Math.min(...args);
        case "round":
          return Math.round(args[0] ?? 0);
      }
    }
  }
}

export function validateSafeMathExpression(input: {
  expression: string;
  allowedIdentifiers: string[];
}) {
  const expression = input.expression.trim();

  if (!expression) {
    throw new Error("Enter a scoring formula");
  }

  const parsed = parseExpression(tokenizeFormula(expression));
  validateExpressionNode(parsed, new Set(input.allowedIdentifiers));
  return parsed;
}

export function evaluateSafeMathExpression(input: {
  expression: string;
  values: Record<string, number>;
}) {
  const parsed = validateSafeMathExpression({
    expression: input.expression,
    allowedIdentifiers: Object.keys(input.values),
  });
  const rawScore = evaluateExpressionNode(parsed, input.values);

  return {
    rawScore,
    normalizedScore: truncateFiniteNumber(rawScore),
  };
}

export function evaluateItemizedCategoryFormula(input: {
  category: ItemizedCategoryDefinition;
  values: Record<string, number | null | undefined> | null | undefined;
}): ItemizedFormulaPreview {
  const normalizedValues = normalizeItemizedValues({
    category: input.category,
    values: input.values,
  });

  return evaluateSafeMathExpression({
    expression: input.category.formula,
    values: normalizedValues,
  });
}

export function parsePersistedItemizedValues(value: string | null | undefined) {
  if (!value) {
    return {};
  }

  const parsed = JSON.parse(value) as Record<string, number | null | undefined>;
  const normalized: Record<string, number> = {};

  for (const [key, entryValue] of Object.entries(parsed)) {
    normalized[key] = truncateFiniteNumber(entryValue ?? 0);
  }

  return normalized;
}

export function buildItemizedPlayerBreakdowns(input: {
  categories: ItemizedCategoryDefinition[];
  players: Array<{ userId: string; score: number | null | undefined }>;
  entries: Array<{
    userId: string;
    categoryId: string;
    valuesJson?: string | null;
  }>;
}) {
  const entryMap = new Map(
    input.entries.map((entry) => [`${entry.userId}:${entry.categoryId}`, entry] as const),
  );

  return input.players.map((player) => {
    const lines = input.categories.map((category) => {
      const rawValues = parsePersistedItemizedValues(
        entryMap.get(`${player.userId}:${category.id}`)?.valuesJson,
      );
      const values = normalizeItemizedValues({
        category,
        values: rawValues,
      });
      const evaluation = evaluateItemizedCategoryFormula({
        category,
        values,
      });
      const included =
        !category.optional ||
        rawValues[ITEMIZED_SCORE_INCLUDED_METADATA_KEY] !== 0;

      return {
        categoryId: category.id,
        categoryName: category.name,
        formula: category.formula,
        helpText: category.helpText,
        values,
        score: included ? evaluation.normalizedScore : 0,
      };
    });

    return {
      userId: player.userId,
      totalScore: player.score ?? lines.reduce((sum, line) => sum + line.score, 0),
      lines,
    };
  });
}
