# คู่มือการเชื่อมต่อ GPSC Transformer Asset Management กับ OneDrive ขององค์กร (Microsoft 365)

เอกสารนี้อธิบายวิธีการเชื่อมต่อหน้าเว็บ Dashboard, Assessment, SCADA และ Plan เข้ากับ **Microsoft OneDrive / SharePoint** ของทีม เพื่อให้ทุกคนในองค์กรสามารถดูและอัปเดตข้อมูลตรงกันแบบ Real-time (Single Source of Truth)

---

## 🌟 โครงสร้างข้อมูลบน OneDrive

ในระบบจะมีไฟล์ Master กลาง 1 ไฟล์:
- **`GPSC_Transformer_Asset_Master.xlsx`**:
  - Sheet 1: **`Transformer_Plan`** (ข้อมูลแผนงาน 52-Week Outage & Maintenance)
  - Sheet 2: **`Health_Index_Fleet`** (ข้อมูลสุขภาพและผลประเมินหม้อแปลงทั้ง 67 ยูนิต)
  - Sheet 3: **`System_Guide`** (คู่มือและคำอธิบายระบบ)

> 💡 **วิธีดาวน์โหลดไฟล์ Master**: สามารถกดปุ่ม **OneDrive** บนหน้าเว็บ แล้วคลิกปุ่ม **"ดาวน์โหลด Excel"** เพื่อนำไฟล์ไปวางไว้ในโฟลเดอร์ OneDrive หรือ Microsoft Teams ของทีมได้ทันที

---

## 🚀 วิธีการเชื่อมต่อ (เลือกวิธีที่เหมาะกับการใช้งาน)

### วิธีที่ 1: เชื่อมต่อผ่าน Cloud Flow (แนะนำสำหรับ GitHub Pages และใช้งานนอกสถานที่)
ไม่ต้องขออนุมัติจากแผนก IT เพราะทำงานภายใต้สิทธิ์บัญชี Microsoft 365 ของพนักงานทุกคน (@gpscgroup.com)

#### ขั้นตอนการตั้งค่า (ใช้เวลา 3 นาที):
1. **เข้าสู่ Power Automate**:
   - เปิดเบราว์เซอร์ไปที่ [make.powerautomate.com](https://make.powerautomate.com)
   - เข้าสู่ระบบด้วยอีเมลองค์กร
2. **สร้าง Cloud Flow ใหม่**:
   - คลิกเมนู **Create** &rarr; เลือก **Instant cloud flow**
   - ตั้งชื่อโฟลว์ เช่น `GPSC-Transformer-Sync`
   - ในช่อง Trigger ให้เลือก: **When an HTTP request is received** แล้วกด **Create**
3. **เพิ่ม Action บันทึก/อ่านไฟล์ใน OneDrive**:
   - กดปุ่ม **+ New step**
   - ค้นหา **Excel Online (Business)** หรือ **OneDrive for Business**
   - เลือก Action เช่น:
     - **Update a row**: อัปเดตข้อมูล Task ลงในตารางของไฟล์ `GPSC_Transformer_Asset_Master.xlsx`
     - หรือ **Create file / Update file**: บันทึกไฟล์ JSON/Excel
4. **ส่ง Response ตอบกลับ**:
   - เพิ่ม Action **Response**
   - ตั้งค่า **Status Code**: `200`
   - Headers: `Content-Type: application/json`
   - Body: `{"success": true}`
5. **รับ URL มาใช้งาน**:
   - กดปุ่ม **Save** (บันทึกโฟลว์)
   - คลิกที่กล่อง Trigger แรก (*When an HTTP request is received*) จะเห็นช่อง **HTTP POST URL**
   - กดปุ่ม Copy URL (ตัวอย่าง: `https://prod-XX.southeastasia.logic.azure.com:443/workflows/...`)
6. **เชื่อมต่อที่หน้าเว็บ**:
   - เปิดหน้า [plan.html](plan.html) หรือ [dashboard.html](dashboard.html)
   - คลิกที่ปุ่ม **OneDrive** (มุมบนขวา)
   - วาง URL ที่คัดลอกมาลงในช่อง **Power Automate HTTP Webhook URL**
   - กดปุ่ม **Test** เพื่อทดสอบ และกด **บันทึกการตั้งค่า**

---

### วิธีที่ 2: รันผ่าน LAN Server (สำหรับใช้งานภายในโรงไฟฟ้า/ออฟฟิศ)
หากเครื่อง Host รันสคริปต์ `serve.ps1` อยู่ในเครือข่ายภายใน:
1. ดับเบิ้ลคลิกไฟล์ `serve.ps1` หรือสั่งรัน:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\serve.ps1 -Port 8888
   ```
2. ระบบจะเปิด REST API Endpoint:
   - `GET /api/plan` &rarr; ดึงข้อมูลแผนงานล่าสุด
   - `POST /api/plan` &rarr; บันทึกแผนงานและสำเนาลงโฟลเดอร์ OneDrive ในเครื่องพีซีให้อัตโนมัติทันที
3. เพื่อนในทีมเปิดลิงก์:
   - `http://<IP-เครื่อง-Host>:8888/plan.html`
   - สถานะ Badge จะแสดงเป็น **LAN Host: Active** ทันทีโดยไม่ต้องตั้งค่าใดๆ เพิ่มเติม

---

## 🛡️ ระบบป้องกันข้อมูลและการทำงานแบบ Offline (Fallback)
- **Local Cache**: แม้ว่าเน็ตจะหลุด หรือยังไม่ได้เชื่อมต่อ OneDrive ระบบจะบันทึกข้อมูลไว้ในเบราว์เซอร์ (`LocalStorage`) ตามปกติ 100% ไม่ทำให้หน้าเว็บค้างหรือเสียหาย
- **Smart Merge**: เมื่อเชื่อมต่อกลับเข้ามา ระบบจะผสาน Task ใหม่อัตโนมัติโดยไม่เขียนทับความคืบหน้าที่ผู้ใช้เคยแก้ไว้
- **Auto Sync**: มีตัวเลือกเปิดซิงค์อัตโนมัติทุกๆ 60 วินาที เพื่อให้ข้อมูลของทั้งทีมอัปเดตตรงกันตลอดวันทำงาน
