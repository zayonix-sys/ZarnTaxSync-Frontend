import { api } from "@/api/client";
import type { Scenario, ScenarioSummary } from "@/api/types";

export async function listScenarios(): Promise<Scenario[]> {
  const res = await api.get<Scenario[]>("/di/scenarios");
  return res.data;
}

export async function runScenario(scenarioNumber: number): Promise<Scenario> {
  const res = await api.post<Scenario>(`/di/scenarios/${scenarioNumber}/run`);
  return res.data;
}

export async function certifyScenario(scenarioNumber: number): Promise<void> {
  await api.put<null>(`/di/scenarios/${scenarioNumber}/certify`);
}

export async function getScenarioSummary(): Promise<ScenarioSummary> {
  const res = await api.get<ScenarioSummary>("/di/scenarios/summary");
  return res.data;
}
