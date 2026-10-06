const assert=require('node:assert/strict');const {PrismaClient}=require('@prisma/client');const bcrypt=require('bcrypt');
const db=new PrismaClient();const base=process.env.DEMO_API_URL||'http://127.0.0.1:2007';
let priorOnlineDrivers=[];
async function request(path,method='GET',body,token){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};}
(async()=>{
 const password=process.env.DEMO_PASSWORD;assert(password);
 assert.equal((await request('/auth/register','POST',{email:'privilege@example.test',password,fullName:'Synthetic',role:'admin'})).status,400);
 const login=async(email,p=password)=>(await request('/auth/login','POST',{email,password:p})).data.access_token;
 // A fresh synthetic driver isolates the one-remittance-per-driver/day rule.
 // Repeated acceptance runs must not collide with yesterday's test fixtures.
 const driverEmail='acceptance-driver-'+Date.now()+'@example.test';
 const driverUser=await db.user.create({data:{email:driverEmail,fullName:'Generated acceptance driver',passwordHash:await bcrypt.hash(password,10),role:'driver',driverProfile:{create:{isApproved:true,isOnline:true,currentLatitude:36.75,currentLongitude:3.06}}}});
 // Isolate offer assignment from other synthetic acceptance runs, then restore it.
 priorOnlineDrivers=await db.driverProfile.findMany({where:{isOnline:true,userId:{not:driverUser.id}},select:{id:true}});
 await db.driverProfile.updateMany({where:{id:{in:priorOnlineDrivers.map(x=>x.id)}},data:{isOnline:false}});
 const customer=await login('customer@example.test');const other=await login('other@example.test');const driver=await login(driverEmail);
 const user=await db.user.findUnique({where:{email:'customer@example.test'}});
 const address=await db.address.findFirst({where:{userId:user.id}});const product=await db.product.findFirst({include:{merchantProfile:true}});
 await db.merchantProfile.update({where:{id:product.merchantProfileId},data:{latitude:36.75,longitude:3.06}});
 await db.cartItem.deleteMany({where:{userId:user.id}});
 await request('/cart','POST',{productId:product.id,quantity:2},customer);
 const promo=await db.promoCode.upsert({where:{code:'SYNTHETIC10'},update:{},create:{code:'SYNTHETIC10',percentage:10,isActive:true}});
 const created=await request('/orders','POST',{addressId:address.id,paymentMethod:'cash',promoCode:promo.code},customer);assert.equal(created.status,201,JSON.stringify(created.data));
 const order=created.data;assert.equal(Number(order.promoDiscountAmount),Number(order.subtotal)*0.1);
 assert.equal((await request('/orders/'+order.id,'GET',null,other)).status,403);
 await db.driverProfile.update({where:{userId:driverUser.id},data:{isOnline:true,isApproved:true,currentLatitude:36.75,currentLongitude:3.06}});
 const merchantUser=await db.user.findUnique({where:{id:product.merchantProfile.userId}});
 const merchant=await login(merchantUser.email,'Merchant123!');
 assert.equal((await request('/orders/'+order.id+'/accept','PATCH',{prepTimeMinutes:10},merchant)).status,200);
 assert.equal((await request('/orders/'+order.id+'/status','PATCH',{status:'preparing'},merchant)).status,200);
 assert.equal((await request('/orders/'+order.id+'/status','PATCH',{status:'ready_for_pickup'},merchant)).status,200);
 assert.equal((await request('/orders/'+order.id+'/take','POST',{},driver)).status,201);
 assert.equal((await request('/orders/'+order.id+'/status','PATCH',{status:'picked_up'},driver)).status,200);
 assert.equal((await request('/orders/'+order.id+'/status','PATCH',{status:'on_the_way'},driver)).status,200);
 assert.equal((await request('/orders/'+order.id+'/status','PATCH',{status:'delivered'},driver)).status,200);
 const count=async()=>({earnings:await db.driverEarning.count({where:{orderId:order.id}}),ledger:await db.merchantLedgerEntry.count({where:{orderId:order.id}}),logs:await db.orderStatusLog.count({where:{orderId:order.id}})});
 const first=await count();assert.equal(first.earnings,1);assert.equal(first.ledger,1);
 assert.equal((await request('/orders/'+order.id+'/status','PATCH',{status:'delivered'},driver)).status,200);assert.deepEqual(await count(),first);
 assert.equal((await request('/orders/'+order.id+'/status','PATCH',{status:'on_the_way'},driver)).status,400);
 const remittance=await request('/driver/remittances','POST',{},driver);assert.equal(remittance.status,201,JSON.stringify(remittance.data));
 const remitRecord=await db.driverRemittance.findUnique({where:{id:remittance.data.remittanceId}});
 assert.equal(Number(remitRecord.amountDueToAdmin),Math.max(0,Number(order.total)-Number(order.deliveryFee)),'Promotion must reduce the cash remitted; do not charge the driver the gross subtotal');
 const admin=await login('admin@example.test',process.env.ADMIN_PASSWORD);
 assert.equal((await request('/admin/remittances/'+remittance.data.remittanceId+'/confirm','POST',{},admin)).status,201);
 assert.equal((await request('/admin/remittances/'+remittance.data.remittanceId+'/confirm','POST',{},admin)).status,400);
 const reconciled=await db.order.findUnique({where:{id:order.id}});assert.equal(reconciled.codStatus,'remitted_confirmed');
 console.log('PASS: role and ownership boundaries, discount, delivery, unique COD entries, terminal state, remittance confirmation and repeated-confirmation rejection.');
})().catch(e=>{console.error(e.message);process.exitCode=1}).finally(async()=>{if(priorOnlineDrivers.length)await db.driverProfile.updateMany({where:{id:{in:priorOnlineDrivers.map(x=>x.id)}},data:{isOnline:true}});await db.$disconnect();});
