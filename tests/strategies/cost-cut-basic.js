import { createStrategy } from './base.js';

export const costCutStrategy = createStrategy('cost-cut-basic', function(engine, state) {
    const owned = state.companies.filter(c => c.isOwned);

    if (owned.length === 0) {
        if (state.availableAcquisitions.length > 0 && state.cash >= 2000000) {
            const positiveEquity = state.availableAcquisitions
                .filter(c => (c.valuation - c.debt) > 0)
                .sort((a, b) => (a.valuation - a.debt) - (b.valuation - b.debt));

            if (positiveEquity.length > 0) {
                engine.buyCompanyLeveraged(positiveEquity[0].id);
            }
        }
    } else {
        const company = owned[0];
        if (!company.isCostCut && company.profit <= 0 && company.viability >= 30) {
            engine.performCut(company.id);
        } else if (company.profit <= 0) {
            const equityAfterStrip = company.valuation - company.debt;
            const canFlip = equityAfterStrip > 0;

            if (company.assets > 0 && !canFlip) {
                engine.performStrip(company.id);
            } else if (canFlip) {
                engine.performFlip(company.id);
            }
        }
    }

    const locations = engine.getLocations();
    const otherLoc = locations.find(l => l.name !== state.location);
    if (otherLoc) {
        engine.travelTo(otherLoc.name);
    }
});