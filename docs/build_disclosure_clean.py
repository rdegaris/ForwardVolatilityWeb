from copy import deepcopy
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import shutil
import sys
from lxml import etree as ET

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
XML_NS = "http://www.w3.org/XML/1998/namespace"
NS = {"w": W_NS}
W = f"{{{W_NS}}}"
XML_SPACE = f"{{{XML_NS}}}space"
DISCLOSURE_DATE = 'August 1, 2026'
DISCLOSURE_DATE_UPPER = 'AUGUST 1, 2026'
ADDRESS_LINE_1 = '46670 Sandia Creek Drive'
ADDRESS_LINE_2 = 'Temecula, CA  92590'


def element_text(element):
    parts = []
    for node in element.findall('.//w:t', NS):
        if node.text:
            parts.append(node.text)
    return ''.join(parts).strip().replace('\r', ' ').replace('\n', ' ')


def set_paragraph_text(paragraph, text):
    keep = []
    for child in list(paragraph):
        if child.tag == W + 'pPr':
            keep.append(deepcopy(child))
    paragraph.clear()
    for child in keep:
        paragraph.append(child)
    run = ET.SubElement(paragraph, W + 'r')
    text_node = ET.SubElement(run, W + 't')
    text_node.text = text
    if text.startswith(' ') or text.endswith(' '):
        text_node.set(XML_SPACE, 'preserve')


def set_cell_text(cell, text):
    paragraphs = [child for child in cell if child.tag == W + 'p']
    if not paragraphs:
        paragraph = ET.SubElement(cell, W + 'p')
    else:
        paragraph = paragraphs[0]
        for extra in paragraphs[1:]:
            cell.remove(extra)
    set_paragraph_text(paragraph, text)


def table_rows(table):
    return table.findall('w:tr', NS)


def row_cells(row):
    return row.findall('w:tc', NS)


def paragraph_with_text(body, prefix):
    for child in body:
        if child.tag == W + 'p' and prefix in element_text(child):
            return child
    raise ValueError(f'Could not find paragraph starting with: {prefix}')


def replace_paragraph(body, prefix, new_text):
    set_paragraph_text(paragraph_with_text(body, prefix), new_text)


def replace_all_paragraphs(body, prefix, new_text):
    replaced = False
    for child in body:
        if child.tag == W + 'p' and prefix in element_text(child):
            set_paragraph_text(child, new_text)
            replaced = True
    if not replaced:
        raise ValueError(f'Could not find any paragraphs containing: {prefix}')


def top_level_index(body, prefix):
    for index, child in enumerate(list(body)):
        if element_text(child).startswith(prefix):
            return index
    raise ValueError(f'Could not find top-level element starting with: {prefix}')


def make_paragraph(text):
    paragraph = ET.Element(W + 'p')
    run = ET.SubElement(paragraph, W + 'r')
    text_node = ET.SubElement(run, W + 't')
    text_node.text = text
    if text.startswith(' ') or text.endswith(' '):
        text_node.set(XML_SPACE, 'preserve')
    return paragraph


def replace_section(body, start_prefix, end_prefix, paragraphs):
    children = list(body)
    start_idx = top_level_index(body, start_prefix)
    end_idx = top_level_index(body, end_prefix)
    for child in children[start_idx:end_idx]:
        body.remove(child)
    insert_at = start_idx
    for text in paragraphs:
        body.insert(insert_at, make_paragraph(text))
        insert_at += 1


def set_table_values(table, values):
    rows = table_rows(table)
    for row_idx, row_values in enumerate(values, start=1):
        cells = row_cells(rows[row_idx - 1])
        for col_idx, value in enumerate(row_values, start=1):
            set_cell_text(cells[col_idx - 1], value)


def find_program_range(body, program_prefix, next_prefix):
    start = top_level_index(body, program_prefix)
    end = top_level_index(body, next_prefix)
    return start, end


def find_table_in_range(body, start, end, prefix):
    children = list(body)
    for child in children[start:end]:
        if child.tag == W + 'tbl' and element_text(child).startswith(prefix):
            return child
    raise ValueError(f'Could not find table starting with: {prefix}')


def update_program(body, program_prefix, next_prefix, config):
    start, end = find_program_range(body, program_prefix, next_prefix)
    children = list(body)
    for child in children[start:end]:
        text = element_text(child)
        if child.tag == W + 'tbl' and text.startswith(program_prefix):
            first_row = table_rows(child)[0]
            set_cell_text(row_cells(first_row)[0], config['heading'])
        elif child.tag == W + 'p':
            for prefix, replacement in config['paragraphs'].items():
                if text.startswith(prefix):
                    set_paragraph_text(child, replacement)
                    break

    table = find_table_in_range(body, start, end, 'MONTH')
    set_table_values(table, config['table'])


def main():
    if len(sys.argv) != 3:
        raise SystemExit('Usage: build_disclosure_clean.py <base_docx> <clean_docx>')

    base_path = Path(sys.argv[1])
    clean_path = Path(sys.argv[2])
    shutil.copyfile(base_path, clean_path)

    with ZipFile(clean_path, 'r') as source_zip:
        package = {name: source_zip.read(name) for name in source_zip.namelist()}

    root = ET.fromstring(package['word/document.xml'])
    body = root.find('w:body', NS)

    replace_paragraph(body, 'MAY 1st 2024', DISCLOSURE_DATE_UPPER)
    replace_paragraph(body, 'The firm is organized as a sole proprietorship.', f'The firm is organized as a sole proprietorship. Ryan DeGaris\'(the "Advisor") place of business is located at {ADDRESS_LINE_1}, Temecula CA 92590. All books and records pertaining to the business of the Advisor will be maintained at the above address. The Advisor intends to use this document as of {DISCLOSURE_DATE}.')
    replace_paragraph(body, 'Performance History from January 2017 through April 30th 2024', 'Performance History from January 2019 through November 30, 2024')
    replace_paragraph(body, 'For current clients, neither a management fee nor incentive fee is currently being charged. As such, the exact fee structure may be negotiated by each client at account opening.', f'As of {DISCLOSURE_DATE}, the Advisor is not charging current clients a management fee or an incentive fee. The exact fee arrangement for any new client may be separately negotiated at account opening.')
    replace_paragraph(body, 'Date of Disclosure Document: September 1st 2022', f'Date of Disclosure Document: {DISCLOSURE_DATE}')
    replace_paragraph(body, 'September 1st, 2022', DISCLOSURE_DATE)
    replace_paragraph(body, 'Its telephone number is (951) 813-0953.', f"The Advisor's address is {ADDRESS_LINE_1}, Temecula CA 92590.  Its telephone number is (951) 813-0953.")
    replace_all_paragraphs(body, '44885 Bouchaine St', ADDRESS_LINE_1)
    replace_all_paragraphs(body, 'Temecula, CA  92592', ADDRESS_LINE_2)

    replace_section(
        body,
        'The Advisor recommends Interactive Brokers (IBKR) as FCM for client brokerage accounts.',
        'INTRODUCING BROKER',
        [
            'The Advisor recommends Interactive Brokers LLC ("IBKR") as the futures commission merchant ("FCM") for client brokerage accounts.',
            '',
            'IBKR may charge commissions and other transaction fees directly to client accounts. For U.S. futures contracts typically traded in the Program, IBKR\'s published execution commissions generally range from approximately $0.25 to $0.85 per contract side, exclusive of applicable exchange, clearing, regulatory, market data and other third-party fees, although certain products may carry lower or higher rates.',
            '',
            f'As of {DISCLOSURE_DATE}, the Advisor is aware of the following material administrative or regulatory actions involving Interactive Brokers LLC within the past five years:',
            '',
            '1. On August 10, 2020, Interactive consented to CFTC, SEC and FINRA orders concerning its anti-money laundering and Bank Secrecy Act compliance program. Interactive agreed to pay penalties of $15 million to FINRA, $11.5 million to the SEC and $11.5 million to the CFTC, plus approximately $700,000 in disgorgement, and to retain an independent consultant.',
            '',
            '2. On June 30, 2022, the CFTC issued an order against Interactive Brokers LLC relating to the supervision of exchange fees charged to customers. The order required IBKR to cease and desist, pay $710,828.14 in disgorgement with credit for money paid to affected customers, and pay a $300,000 civil monetary penalty.',
            '',
            '3. On September 29, 2023, the CFTC entered administrative action No. 23-56 against Interactive Brokers LLC and ordered IBKR to pay a $20,000,000 civil monetary penalty.',
            '',
            'Each client retains full control over his or her account at the FCM and may add or withdraw funds at any time. Clients will receive confirmations and monthly statements directly from the FCM.',
            '',
        ],
    )

    update_program(
        body,
        'Program: Cycle Twin (11)',
        'Program: Cycle Twin (12)',
        {
            'heading': 'Program: Cycle Twin (11)',
            'paragraphs': {
                'CTA began trading this Program:': 'CTA began trading this Program: October 21st, 2012.',
                'E.Amount of Nominal Assets Under Management in the offered trading program:': 'E.Amount of Nominal Assets Under Management in the offered trading program:  $90,187.',
                'Total Amount of Nominal Assets Under Management in all trading programs:': 'Total Amount of Nominal Assets Under Management in all trading programs:  $173,360',
                'F.Largest Monthly Drawdown:': 'F.Largest Monthly Drawdown:  -31.21% on 10/2022',
                'G.Worst Peak-to-Valley Drawdown:': 'G.Worst Peak-to-Valley Drawdown:  -57.18% from March 2020 to January 2023',
                'Note: For the performance shown, no management fees nor incentive fees were applied to the accounts in the capsule.': 'Note: The rates of return in this capsule are net of commissions and the Standard Brokerage Fee actually charged to the accounts. No management fees or incentive fees were charged to accounts within this capsule during the periods presented.',
            },
            'table': [
                ['MONTH', '2019', '2020', '2021', '2022', '2023', '2024'],
                ['January', '-2.27%', '4.55%', '-5.60%', '-0.09%', '-1.71%', 'NT'],
                ['February', '-1.44%', '0.46%', '0.72%', '3.78%', 'NT', 'NT'],
                ['March', '-2.46%', '17.96%', '5.10%', '-3.14%', 'NT', 'NT'],
                ['April', '-1.56%', '-7.59%', '-2.95%', '3.89%', 'NT', 'NT'],
                ['May', '9.80%', '-3.55%', '-1.61%', '2.14%', 'NT', 'NT'],
                ['June', '4.41%', '-4.75%', '0.72%', '0.76%', 'NT', 'NT'],
                ['July', '5.86%', '0.79%', '-3.76%', '1.62%', 'NT', 'NT'],
                ['August', '7.70%', '0.03%', '-5.35%', '-3.07%', 'NT', 'NT'],
                ['September', '-6.00%', '4.11%', '-4.43%', '-0.57%', 'NT', 'NT'],
                ['October', '6.49%', '-2.27%', '6.93%', '-31.21%', 'NT', 'NT'],
                ['November', '-0.98%', '-4.08%', '0.52%', '-8.35%', 'NT', 'NT'],
                ['December', '7.76%', '-4.96%', '0.37%', '-8.30%', 'NT', ''],
                ['YEAR', '29.12%', '-1.64%', '-9.74%', '-39.20%', '-1.71%', '0.00%'],
            ],
        },
    )

    update_program(
        body,
        'Program: Cycle Twin (12)',
        'Program: Cycle Twin (13)',
        {
            'heading': 'Program: Cycle Twin (12) * The rates of return in this capsule are net of commissions and all fees actually charged to the account. Management Fees and Incentive Fees were charged through January 2019. From February 2019 forward, only the Standard Brokerage Fee was applied.',
            'paragraphs': {
                'E.Amount of Nominal Assets Under Management in the offered trading program:': 'E.Amount of Nominal Assets Under Management in the offered trading program:  $81,638.',
                'Total Amount of Nominal Assets Under Management in all trading programs:': 'Total Amount of Nominal Assets Under Management in all trading programs:  $173,360',
                'F.Largest Monthly Drawdown:': 'F.Largest Monthly Drawdown: -31.05% on 01/2019',
                'G.Worst Peak-to-Valley Drawdown:': 'G.Worst Peak-to-Valley Drawdown:  -66.60% from January 2019 to April 2019',
                'Note: The account presented in this Cycle Twin (12) account began trading in October 2015': 'Note: The account presented in this Cycle Twin (12) capsule began trading in October 2015 and performance was previously presented in the Cycle Twin (11) performance capsule. The account was broken out from the Cycle Twin (11) capsule in October 2018 when the percentage performance varied with the other accounts in the capsule outside the NFA requirements. This was due to 1) other accounts in the capsule not being traded, 2) margin requirements (IRA account versus regular), 3) drastically differing starting equity, and 4) inconsistent use of $25,000 trading units due to individual client risk tolerance.',
            },
            'table': [
                ['MONTH', '2019', '2020', '2021', '2022', '2023', '2024'],
                ['January', '-31.05%', '-2.13%', '-13.35%', '1.80%', '-4.75%', 'NT'],
                ['February', '-8.37%', '8.58%', '-3.59%', '9.57%', 'NT', 'NT'],
                ['March', '-27.29%', '33.42%', '13.21%', '-5.01%', 'NT', 'NT'],
                ['April', '-27.30%', '-8.87%', '-3.59%', '8.10%', 'NT', 'NT'],
                ['May', '50.41%', '-7.15%', '-4.77%', '3.21%', 'NT', 'NT'],
                ['June', '17.05%', '-10.45%', '0.48%', '3.13%', 'NT', 'NT'],
                ['July', '33.71%', '2.39%', '-2.15%', '4.69%', 'NT', 'NT'],
                ['August', '34.23%', '0.12%', '1.20%', '-8.05%', 'NT', 'NT'],
                ['September', '-18.76%', '10.59%', '-9.66%', '2.02%', 'NT', 'NT'],
                ['October', '-9.55%', '-5.40%', '7.09%', '-29.89%', 'NT', 'NT'],
                ['November', '5.14%', '-9.21%', '-0.05%', '2.60%', 'NT', 'NT'],
                ['December', '8.48%', '-8.55%', '3.52%', '-5.44%', 'NT', ''],
                ['YEAR', '-11.56%', '-4.34%', '-13.52%', '-18.56%', '-4.75%', '0.00%'],
            ],
        },
    )

    update_program(
        body,
        'Program: Cycle Twin (13)',
        'TAX ASPECTS',
        {
            'heading': 'Program: Cycle Twin (13)',
            'paragraphs': {
                'E.Amount of Nominal Assets Under Management in the offered trading program:': 'E.Amount of Nominal Assets Under Management in the offered trading program:  $1,535.',
                'Total Amount of Nominal Assets Under Management in all trading programs:': 'Total Amount of Nominal Assets Under Management in all trading programs:  $173,360',
                'F.Largest Monthly Drawdown:': 'F.Largest Monthly Drawdown:  -53.04% on 08/2024',
                'G.Worst Peak-to-Valley Drawdown:': 'G.Worst Peak-to-Valley Drawdown:  -97.32% from July 2022 to August 2024',
                'No management fees or incentive fees were charged to accounts within this capsule.': 'No management fees or incentive fees were charged to accounts within this capsule. The rates of return are net of commissions and the Standard Brokerage Fee actually charged to the account.',
                'Performance in the Cycle 13 capsule deviates from Cycle 11 and Cycle 12 due to 1) Lower starting equity and 2) Client desire for a greater risk tolerance': 'Performance in the Cycle 13 capsule deviates from Cycle 11 and Cycle 12 due to 1) lower starting equity and 2) client desire for a greater risk tolerance.',
            },
            'table': [
                ['MONTH', '2022', '2023', '2024'],
                ['January', '4.29%', '9.88%', '18.14%'],
                ['February', '29.53%', '-6.12%', '-22.31%'],
                ['March', '-12.80%', '-11.35%', '2.79%'],
                ['April', '21.44%', '-28.31%', '-0.56%'],
                ['May', '15.24%', '-31.74%', '-12.22%'],
                ['June', '6.11%', '-40.74%', '-11.57%'],
                ['July', '6.62%', '-23.34%', '3.88%'],
                ['August', '-8.61%', '33.65%', '-53.04%'],
                ['September', '7.42%', '-48.12%', '6.39%'],
                ['October', '-39.04%', '-28.40%', 'NT'],
                ['November', '8.24%', '50.87%', 'NT'],
                ['December', '-13.92%', '-11.22%', ''],
                ['YEAR', '3.99%', '-86.48%', '-62.21%'],
            ],
        },
    )

    replace_section(
        body,
        'EXHIBIT E:',
        'END OF DOCUMENT',
        [
            'EXHIBIT E:',
            'INTERACTIVE BROKERS DISCLOSURES',
            '',
            DISCLOSURE_DATE,
            'Disclosure of Actions Involving Interactive Brokers LLC',
            '',
            'Pursuant to the requirements of the National Futures Association ("NFA"), this memorandum summarizes material administrative or regulatory actions involving Interactive Brokers LLC ("IBKR") within the past five years.',
            '',
            'Disclosures',
            '',
            '1. On August 10, 2020, Interactive consented to CFTC, SEC and FINRA orders concerning its anti-money laundering and Bank Secrecy Act compliance program. Interactive agreed to pay penalties of $15 million to FINRA, $11.5 million to the SEC and $11.5 million to the CFTC, plus approximately $700,000 in disgorgement, and to retain an independent consultant.',
            '',
            '2. On June 30, 2022, the CFTC issued an order against Interactive Brokers LLC relating to the supervision of exchange fees charged to customers. The order required IBKR to cease and desist, pay $710,828.14 in disgorgement with credit for money paid to affected customers, and pay a $300,000 civil monetary penalty.',
            '',
            '3. On September 29, 2023, the CFTC entered administrative action No. 23-56 against Interactive Brokers LLC and ordered IBKR to pay a $20,000,000 civil monetary penalty.',
            '',
        ],
    )

    package['word/document.xml'] = ET.tostring(root, encoding='utf-8', xml_declaration=True, standalone=True)

    with ZipFile(clean_path, 'w', compression=ZIP_DEFLATED) as target_zip:
        for name, data in package.items():
            target_zip.writestr(name, data)


if __name__ == '__main__':
    main()