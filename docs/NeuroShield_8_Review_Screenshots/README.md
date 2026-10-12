# NeuroShield review screenshots

Captured from the actual public production frontend (build f0eb7e1a) and live Render API on 12 October 2026. Full-page browser captures preserve original browser resolution; they have not been upscaled, retouched, or changed to alter test results. The PDF image is a 220-DPI rendering of the actual downloaded one-page report.

| Figure | File | Actual observation |
|---|---|---|
| 1.1 | Fig_1_1_SOC_Command_Center.jpg | Connected FastAPI demo feed and pinned investigation |
| 1.2 | Fig_1_2_Scam_Lab_Analysis.jpg | Prepared urgency SMS, API score 60, predicted class Safe |
| 2.1 | Fig_2_1_Text_API_Swagger.jpg | Live POST /api/scan-text; HTTP 200; separate synthetic text input, score 65 |
| 2.2 | Fig_2_2_Network_API_Swagger.jpg | Live POST /api/scan-network; HTTP 200; score 100 |
| 3.1 | Fig_3_1_SYN_Flood_Critical.jpg | Submitted fixture: 100/100 Critical |
| 3.2 | Fig_3_2_Normal_Baseline_Safe.jpg | Submitted fixture: 0/100 Safe |
| 4.1 | Fig_4_1_Incident_Triage_Contained.jpg | Tested incident manually moved to Contained |
| 4.2 | Fig_4_2_Exported_Incident_PDF.png | Actual report with evidence, digest and status history |

The two API screenshots use FastAPI Swagger UI, not Postman. Change their slide captions accordingly. A successful HTTP response proves request handling, not detection accuracy. The text classifier's Safe prediction is preserved despite suspicious language; do not describe it as successful scam classification. The two text screenshots use different prepared messages and therefore have different scores.

Contained is an application status; no real network isolation was performed. The report's response field still says Pending review while its mitigation history records the Contained transition. This is the actual exported output. A Unicode status-arrow glyph also renders imperfectly in the PDF. Neither issue has been concealed by image editing.

Use the individual originals in slides, not Screenshot_Preview.jpg (which is only a contact sheet). Long full-page captures are reference evidence; crop to the relevant request/result areas in PowerPoint for readability and retain labels and caveats. Avoid shrinking a whole long page into a tiny quadrant. Two images per slide will generally be more readable than four.
