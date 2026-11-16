/**
 * UI Manager - Centralized control of all UI components
 * Coordinates between handlers, tree views, panels, and diagnostics
 */
import { Logger } from '../utils/logger';
import { SecurityPanel } from './security-panel';
import { SummaryPanel } from './summary-panel';
import { InlineDiagnostics } from './diagnostics';
import { AnalysisHistoryProvider } from '../views/analysis-history';
import { RecommendationsProvider } from '../views/recommendations';
import { AnalysisSummary, SecurityAnalysisResult } from '../constants';
/**
 * Centralized UI component manager
 * Provides single point of access for all UI operations
 */
export declare class UIManager {
    private securityPanel;
    private summaryPanel;
    private diagnostics;
    private historyProvider;
    private recommendationsProvider;
    private logger;
    constructor(securityPanel: SecurityPanel, summaryPanel: SummaryPanel, diagnostics: InlineDiagnostics, historyProvider: AnalysisHistoryProvider, recommendationsProvider: RecommendationsProvider, logger: Logger);
    /**
     * Show security findings before commit (pre-commit flow)
     */
    showSecurityFindings(result: SecurityAnalysisResult): Promise<boolean>;
    /**
     * Show post-commit analysis summary
     */
    showAnalysisSummary(summary: AnalysisSummary): Promise<void>;
    /**
     * Clear all findings from editor
     */
    clearFindings(): void;
    /**
     * Refresh all tree views
     */
    refreshViews(): void;
    /**
     * Hide security panel
     */
    hideSecurityPanel(): void;
    /**
     * Hide summary panel
     */
    hideSummaryPanel(): void;
    /**
     * Export all UI components (for testing)
     */
    getComponents(): {
        securityPanel: SecurityPanel;
        summaryPanel: SummaryPanel;
        diagnostics: InlineDiagnostics;
        historyProvider: AnalysisHistoryProvider;
        recommendationsProvider: RecommendationsProvider;
    };
    /**
     * Get UI statistics
     */
    getStats(): {
        historicalAnalyses: number;
        recommendations: number;
        activeDiagnostics: number;
    };
    dispose(): void;
}
//# sourceMappingURL=ui-manager.d.ts.map