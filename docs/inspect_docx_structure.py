from zipfile import ZipFile
import xml.etree.ElementTree as ET

NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
PATH = r"C:/Ryan/CTA Business/Forward Volatility/forward-volatility-web/docs/DCM_CTA_DDOC_REV3_BASE.docx"


def element_text(element):
    parts = []
    for node in element.findall('.//w:t', NS):
        if node.text:
            parts.append(node.text)
    return ''.join(parts).strip().replace('\r', ' ').replace('\n', ' ')


root = ET.fromstring(ZipFile(PATH).read('word/document.xml'))
body = root.find('w:body', NS)
items = []

for child in body:
    tag = child.tag.split('}')[-1]
    text = element_text(child)
    if text:
        items.append((tag, text[:240]))

for index, (tag, text) in enumerate(items):
    if (
        'Program: Cycle Twin (11)' in text
        or 'Program: Cycle Twin (12)' in text
        or 'Program: Cycle Twin (13)' in text
        or 'Time Weighted Average Method was used' in text
    ):
        for neighbor in range(max(0, index - 3), min(len(items), index + 8)):
            print(neighbor, items[neighbor][0], items[neighbor][1])
        print('---')

table_indices = []
for index, child in enumerate(body):
    tag = child.tag.split('}')[-1]
    if tag != 'tbl':
        continue
    text = element_text(child)
    if 'Program: Cycle Twin' in text or 'MONTH' in text:
        table_indices.append((index, child, text[:120]))

print('TABLE DETAILS')
for index, table, preview in table_indices:
    print('TABLE', index, preview)
    rows = table.findall('w:tr', NS)
    for row_idx, row in enumerate(rows, start=1):
        cell_texts = []
        for cell in row.findall('w:tc', NS):
            cell_texts.append(element_text(cell))
        print('  ROW', row_idx, cell_texts)
    print('---')