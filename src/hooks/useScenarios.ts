import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  certifyScenario,
  getScenarioSummary,
  listScenarios,
  runScenario,
} from "@/api/scenarios";

const SCENARIOS_KEY = "scenarios";
const SCENARIO_SUMMARY_KEY = "scenario-summary";

export function useScenariosList() {
  return useQuery({
    queryKey: [SCENARIOS_KEY],
    queryFn: listScenarios,
    staleTime: 30_000,
  });
}

export function useScenarioSummary() {
  return useQuery({
    queryKey: [SCENARIO_SUMMARY_KEY],
    queryFn: getScenarioSummary,
    staleTime: 30_000,
  });
}

export function useRunScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (scenarioNumber: number) => runScenario(scenarioNumber),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SCENARIOS_KEY] });
      qc.invalidateQueries({ queryKey: [SCENARIO_SUMMARY_KEY] });
    },
  });
}

export function useCertifyScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (scenarioNumber: number) => certifyScenario(scenarioNumber),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SCENARIOS_KEY] });
      qc.invalidateQueries({ queryKey: [SCENARIO_SUMMARY_KEY] });
      toast.success("Scenario certified");
    },
  });
}
