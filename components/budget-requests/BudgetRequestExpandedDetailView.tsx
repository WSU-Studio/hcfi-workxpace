import Card from '@/components/ui/Card';
import {
  BudgetRequestClassificationSection,
  BudgetRequestDetailSummarySection,
  BudgetRequestLineItemsSection,
  type BudgetRequestDetailSectionsData,
} from '@/components/budget-requests/BudgetRequestDetailSections';

export type BudgetRequestExpandedDetailProps = {
  data: BudgetRequestDetailSectionsData;
  originOfficeLabel: string;
  accountLabel: string;
  opexType: string;
  totals: {
    transactionAmount: number;
    vatAmount: number;
    whtAmount: number;
    invoiceAmount: number;
    grandTotal: number;
  };
};

export default function BudgetRequestExpandedDetailView({
  data,
  originOfficeLabel,
  accountLabel,
  opexType,
  totals,
}: BudgetRequestExpandedDetailProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{data.subject}</h1>
        <p className="mt-1 text-sm text-gray-500">{data.code}</p>
      </div>

      <Card className="space-y-6">
        <BudgetRequestDetailSummarySection data={data} originOfficeLabel={originOfficeLabel} />
      </Card>

      {data.lineItems.length > 0 ? (
        <Card>
          <BudgetRequestLineItemsSection lineItems={data.lineItems} totals={totals} />
        </Card>
      ) : null}

      <Card>
        <BudgetRequestClassificationSection data={data} accountLabel={accountLabel} opexType={opexType} />
      </Card>
    </div>
  );
}
