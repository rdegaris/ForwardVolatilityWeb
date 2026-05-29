$ErrorActionPreference = 'Stop'

$sourcePath = "C:\Ryan\CTA Business\Forward Volatility\forward-volatility-web\docs\DCM_CTA_DDOC_REV2_MARKED.docx"
$basePath = "C:\Ryan\CTA Business\Forward Volatility\forward-volatility-web\docs\DCM_CTA_DDOC_REV3_BASE.docx"
$markedPath = "C:\Ryan\CTA Business\Forward Volatility\forward-volatility-web\docs\DCM_CTA_DDOC_REV3_MARKED.docx"
$cleanPath = "C:\Ryan\CTA Business\Forward Volatility\forward-volatility-web\docs\DCM_CTA_DDOC_REV3_CLEAN.docx"

$wdAlertsNone = 0
$wdFormatDocumentDefault = 16

function Replace-FirstText {
    param(
        $Document,
        [string]$FindText,
        [string]$ReplaceText
    )

    $range = $Document.Content.Duplicate
    $range.Find.ClearFormatting() | Out-Null
    $range.Find.Replacement.ClearFormatting() | Out-Null
    if (-not $range.Find.Execute($FindText)) {
        throw "Could not find text: $FindText"
    }
    $range.Text = $ReplaceText
}

function Replace-BetweenMarkers {
    param(
        $Document,
        [string]$StartText,
        [string]$EndText,
        [string]$ReplacementText
    )

    $startRange = $Document.Content.Duplicate
    $startRange.Find.ClearFormatting() | Out-Null
    if (-not $startRange.Find.Execute($StartText)) {
        throw "Could not find start marker: $StartText"
    }

    $replaceStart = $startRange.Start
    $endRange = $Document.Range($replaceStart, $Document.Content.End)
    $endRange.Find.ClearFormatting() | Out-Null
    if (-not $endRange.Find.Execute($EndText)) {
        throw "Could not find end marker: $EndText"
    }

    $replaceRange = $Document.Range($replaceStart, $endRange.Start)
    $replaceRange.Delete()

    $insertRange = $Document.Range($replaceStart, $replaceStart)
    $insertRange.Text = $ReplacementText
}

$affiliationsBlock = @'
The Advisor recommends Interactive Brokers LLC ("IBKR") as the futures commission merchant ("FCM") for client brokerage accounts.

IBKR may charge commissions and other transaction fees directly to client accounts. For U.S. futures contracts typically traded in the Program, IBKR's published execution commissions generally range from approximately $0.25 to $0.85 per contract side, exclusive of applicable exchange, clearing, regulatory, market data and other third-party fees, although certain products may carry lower or higher rates.

As of December 1, 2024, the Advisor is aware of the following material administrative or regulatory actions involving Interactive Brokers LLC within the past five years:

1. On August 10, 2020, Interactive consented to CFTC, SEC and FINRA orders concerning its anti-money laundering and Bank Secrecy Act compliance program. Interactive agreed to pay penalties of $15 million to FINRA, $11.5 million to the SEC and $11.5 million to the CFTC, plus approximately $700,000 in disgorgement, and to retain an independent consultant.

2. On June 30, 2022, the CFTC issued an order against Interactive Brokers LLC relating to the supervision of exchange fees charged to customers. The order required IBKR to cease and desist, pay $710,828.14 in disgorgement with credit for money paid to affected customers, and pay a $300,000 civil monetary penalty.

3. On September 29, 2023, the CFTC entered administrative action No. 23-56 against Interactive Brokers LLC and ordered IBKR to pay a $20,000,000 civil monetary penalty.

Each client retains full control over his or her account at the FCM and may add or withdraw funds at any time. Clients will receive confirmations and monthly statements directly from the FCM.


'@

$cycle11Block = @'
Program: Cycle Twin (11)


A.	Name of the CTA:  Ryan DeGaris, CTA
	
B.	Name of the Trading Program:  Cycle Twin (11)
	
C.	CTA began trading client accounts:  September 1, 2009.
	CTA began trading this Program: October 21st, 2012.

D.	Number of Accounts currently traded pursuant to program:  1.	
 
E.	Amount of Nominal Assets Under Management in the offered trading program:  $90,187.
            	Total Amount of Nominal Assets Under Management in all trading programs:  $173,360
                             
F.	Largest Monthly Drawdown:  -31.21% on 10/2022
	Note:  Drawdown means losses experienced by the trading program over a period of time.

G.	Worst Peak-to-Valley Drawdown:  -57.18% from March 2020 to January 2023
Note:  Peak-to-valley drawdown means the greatest cumulative percentage decline in month-end Net Asset Value ("NAV") due to losses sustained by a trading program during any period in which the initial month-end NAV is not equaled or exceeded by a subsequent month-end NAV.

H.	Number of accounts traded pursuant to the offered trading program that were closed with
Positive net performance:  3

I.	Range of returns for positive accounts "opened" and "closed": (3.23% to 10.54%)


J.	Number of accounts traded pursuant to the offered trading program that were closed with
Negative net performance:  16

K.	Range of returns for negative accounts "opened" and "closed": (-5.23% to -52.44%)



The Time Weighted Average Method was used to compute the rate of return.

Note: The rates of return in this capsule are net of commissions and the Standard Brokerage Fee actually charged to the accounts. No management fees or incentive fees were charged to accounts within this capsule during the periods presented.





PAST PERFORMANCE IS NOT NECESSARILY INDICATIVE OF FUTURE RESULTS

MONTH	2019	2020	2021	2022	2023	2024
January	-2.27%	4.55%	-5.60%	-0.09%	-1.71%	NT
February	-1.44%	0.46%	0.72%	3.78%	NT	NT
March	-2.46%	17.96%	5.10%	-3.14%	NT	NT
April	-1.56%	-7.59%	-2.95%	3.89%	NT	NT
May	9.80%	-3.55%	-1.61%	2.14%	NT	NT
June	4.41%	-4.75%	0.72%	0.76%	NT	NT
July	5.86%	0.79%	-3.76%	1.62%	NT	NT
August	7.70%	0.03%	-5.35%	-3.07%	NT	NT
September	-6.00%	4.11%	-4.43%	-0.57%	NT	NT
October	6.49%	-2.27%	6.93%	-31.21%	NT	NT
November	-0.98%	-4.08%	0.52%	-8.35%	NT	NT
December	7.76%	-4.96%	0.37%	-8.30%	NT	
    YEAR	29.12%	-1.64%	-9.74%	-39.20%	-1.71%	0.00%




'@

$cycle12Block = @'
Program: Cycle Twin (12)

* The rates of return in this capsule are net of commissions and all fees actually charged to the account. Management Fees and Incentive Fees were charged through January 2019. From February 2019 forward, only the Standard Brokerage Fee was applied.



A.	Name of the CTA:  Ryan DeGaris, CTA
	
B.	Name of the Trading Program:  Cycle Twin (12)
	
C.	CTA began trading client accounts:  September 1, 2009.
	CTA began trading this Program: October 1st, 2018.

D.	Number of Accounts currently traded pursuant to program:  1.	
 
E.	Amount of Nominal Assets Under Management in the offered trading program:  $81,638.
            	Total Amount of Nominal Assets Under Management in all trading programs:  $173,360
                             
F.	Largest Monthly Drawdown: -31.05% on 01/2019
	Note:  Drawdown means losses experienced by the trading program over a period of time.

G.	Worst Peak-to-Valley Drawdown:  -66.60% from January 2019 to April 2019
Note:  Peak-to-valley drawdown means the greatest cumulative percentage decline in month-end Net Asset Value ("NAV") due to losses sustained by a trading program during any period in which the initial month-end NAV is not equaled or exceeded by a subsequent month-end NAV.

H.	Number of accounts traded pursuant to the offered trading program that were closed with
Positive net performance:  0

I.	Range of returns for positive accounts "opened" and "closed": N/A


J.	Number of accounts traded pursuant to the offered trading program that were closed with
Negative net performance:  0

K.	Range of returns for negative accounts "opened" and "closed": N/A



The Time Weighted Average Method was used to compute the rate of return.





PAST PERFORMANCE IS NOT NECESSARILY INDICATIVE OF FUTURE RESULTS

MONTH	2019	2020	2021	2022	2023	2024
January	-31.05%	-2.13%	-13.35%	1.80%	-4.75%	NT
February	-8.37%	8.58%	-3.59%	9.57%	NT	NT
March	-27.29%	33.42%	13.21%	-5.01%	NT	NT
April	-27.30%	-8.87%	-3.59%	8.10%	NT	NT
May	50.41%	-7.15%	-4.77%	3.21%	NT	NT
June	17.05%	-10.45%	0.48%	3.13%	NT	NT
July	33.71%	2.39%	-2.15%	4.69%	NT	NT
August	34.23%	0.12%	1.20%	-8.05%	NT	NT
September	-18.76%	10.59%	-9.66%	2.02%	NT	NT
October	-9.55%	-5.40%	7.09%	-29.89%	NT	NT
November	5.14%	-9.21%	-0.05%	2.60%	NT	NT
December	8.48%	-8.55%	3.52%	-5.44%	NT	
    YEAR	-11.56%	-4.34%	-13.52%	-18.56%	-4.75%	0.00%

Note: The account presented in this Cycle Twin (12) capsule began trading in October 2015 and performance was previously presented in the Cycle Twin (11) performance capsule. The account was broken out from the Cycle Twin (11) capsule in October 2018 when the percentage performance varied with the other accounts in the capsule outside the NFA requirements. This was due to 1) other accounts in the capsule not being traded, 2) margin requirements (IRA account versus regular), 3) drastically differing starting equity, and 4) inconsistent use of $25,000 trading units due to individual client risk tolerance.



'@

$cycle13Block = @'
Program: Cycle Twin (13)


A.	Name of the CTA:  Ryan DeGaris, CTA
	
B.	Name of the Trading Program:  Cycle Twin (13)
	
C.	CTA began trading client accounts:  September 1, 2009.
	CTA began trading this Program: January 1st, 2022.

D.	Number of Accounts currently traded pursuant to program:  1.	
 
E.	Amount of Nominal Assets Under Management in the offered trading program:  $1,535.
            	Total Amount of Nominal Assets Under Management in all trading programs:  $173,360
                             
F.	Largest Monthly Drawdown:  -53.04% on 08/2024
	Note:  Drawdown means losses experienced by the trading program over a period of time.

G.	Worst Peak-to-Valley Drawdown:  -97.32% from July 2022 to August 2024
Note:  Peak-to-valley drawdown means the greatest cumulative percentage decline in month-end Net Asset Value ("NAV") due to losses sustained by a trading program during any period in which the initial month-end NAV is not equaled or exceeded by a subsequent month-end NAV.

H.	Number of accounts traded pursuant to the offered trading program that were closed with
Positive net performance:  0

I.	Range of returns for positive accounts "opened" and "closed": N/A


J.	Number of accounts traded pursuant to the offered trading program that were closed with
Negative net performance:  0

K.	Range of returns for negative accounts "opened" and "closed": N/A


The Time Weighted Average Method was used to compute the rate of return.

No management fees or incentive fees were charged to accounts within this capsule. The rates of return are net of commissions and the Standard Brokerage Fee actually charged to the account.


PAST PERFORMANCE IS NOT NECESSARILY INDICATIVE OF FUTURE RESULTS

MONTH	2022	2023	2024
January	4.29%	9.88%	18.14%
February	29.53%	-6.12%	-22.31%
March	-12.80%	-11.35%	2.79%
April	21.44%	-28.31%	-0.56%
May	15.24%	-31.74%	-12.22%
June	6.11%	-40.74%	-11.57%
July	6.62%	-23.34%	3.88%
August	-8.61%	33.65%	-53.04%
September	7.42%	-48.12%	6.39%
October	-39.04%	-28.40%	NT
November	8.24%	50.87%	NT
December	-13.92%	-11.22%	
    YEAR	3.99%	-86.48%	-62.21%


Performance in the Cycle 13 capsule deviates from Cycle 11 and Cycle 12 due to 1) lower starting equity and 2) client desire for a greater risk tolerance.


'@

$exhibitEBlock = @'
EXHIBIT E:
INTERACTIVE BROKERS DISCLOSURES


December 1, 2024
Disclosure of Actions Involving Interactive Brokers LLC

Pursuant to the requirements of the National Futures Association ("NFA"), this memorandum summarizes material administrative or regulatory actions involving Interactive Brokers LLC ("IBKR") within the past five years.

Disclosures

1. On August 10, 2020, Interactive consented to CFTC, SEC and FINRA orders concerning its anti-money laundering and Bank Secrecy Act compliance program. Interactive agreed to pay penalties of $15 million to FINRA, $11.5 million to the SEC and $11.5 million to the CFTC, plus approximately $700,000 in disgorgement, and to retain an independent consultant.

2. On June 30, 2022, the CFTC issued an order against Interactive Brokers LLC relating to the supervision of exchange fees charged to customers. The order required IBKR to cease and desist, pay $710,828.14 in disgorgement with credit for money paid to affected customers, and pay a $300,000 civil monetary penalty.

3. On September 29, 2023, the CFTC entered administrative action No. 23-56 against Interactive Brokers LLC and ordered IBKR to pay a $20,000,000 civil monetary penalty.


'@

$word = $null
$doc = $null

try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = $wdAlertsNone

    $doc = $word.Documents.Open($sourcePath, $false, $false)
    $doc.SaveAs([ref]$basePath, [ref]$wdFormatDocumentDefault)
    $doc.AcceptAllRevisions()
    $doc.Save()
    $doc.Close()
    $doc = $null

    $doc = $word.Documents.Open($basePath, $false, $false)
    $doc.TrackRevisions = $true

    Replace-FirstText -Document $doc -FindText 'MAY 1st 2024' -ReplaceText 'DECEMBER 1, 2024'
    Replace-FirstText -Document $doc -FindText 'The Advisor intends to use this document as of May 1st 2024..' -ReplaceText 'The Advisor intends to use this document as of December 1, 2024.'
    Replace-FirstText -Document $doc -FindText 'Performance History from January 2017 through April 30th 2024' -ReplaceText 'Performance History from January 2019 through November 30, 2024'
    Replace-FirstText -Document $doc -FindText 'For current clients, neither a management fee nor incentive fee is currently being charged. As such, the exact fee structure may be negotiated by each client at account opening.' -ReplaceText 'As of December 1, 2024, the Advisor is not charging current clients a management fee or an incentive fee. The exact fee arrangement for any new client may be separately negotiated at account opening.'
    Replace-FirstText -Document $doc -FindText 'Date of Disclosure Document: September 1st 2022' -ReplaceText 'Date of Disclosure Document: December 1, 2024'
    Replace-FirstText -Document $doc -FindText 'September 1st, 2022' -ReplaceText 'December 1, 2024'
    Write-Output 'Replacing affiliations section'
    Replace-BetweenMarkers -Document $doc -StartText 'The Advisor recommends Interactive Brokers (IBKR) as FCM for client brokerage accounts.' -EndText 'INTRODUCING BROKER' -ReplacementText $affiliationsBlock
    Write-Output 'Replacing Cycle 11 block'
    Replace-BetweenMarkers -Document $doc -StartText 'Program: Cycle Twin (11)' -EndText 'Program: Cycle Twin (12)' -ReplacementText $cycle11Block
    Write-Output 'Replacing Cycle 12 block'
    Replace-BetweenMarkers -Document $doc -StartText 'Program: Cycle Twin (12)' -EndText 'Program: Cycle Twin (13)' -ReplacementText $cycle12Block
    Write-Output 'Replacing Cycle 13 block'
    Replace-BetweenMarkers -Document $doc -StartText 'Program: Cycle Twin (13)' -EndText 'TAX ASPECTS' -ReplacementText ($cycle13Block + 'TAX ASPECTS')
    Write-Output 'Replacing Exhibit E block'
    Replace-BetweenMarkers -Document $doc -StartText 'EXHIBIT E:' -EndText 'END OF DOCUMENT' -ReplacementText ($exhibitEBlock + 'END OF DOCUMENT')

    $doc.SaveAs([ref]$markedPath, [ref]$wdFormatDocumentDefault)
    $doc.AcceptAllRevisions()
    $doc.SaveAs([ref]$cleanPath, [ref]$wdFormatDocumentDefault)
    $doc.Close()
    $doc = $null

    Remove-Item -LiteralPath $basePath -Force
}
finally {
    if ($doc -ne $null) {
        $doc.Close()
    }
    if ($word -ne $null) {
        $word.Quit()
    }
}