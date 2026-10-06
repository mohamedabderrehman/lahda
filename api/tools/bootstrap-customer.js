const {PrismaClient}=require('@prisma/client');const bcrypt=require('bcrypt');
const db=new PrismaClient();
(async()=>{
 const password=process.env.DEMO_PASSWORD;
 if(!password || password.length<12)throw new Error('Set DEMO_PASSWORD (12+ characters); use a disposable seeded database');
 const hash=await bcrypt.hash(password,10);
 for(const name of ['customer','other']) {
  const user=await db.user.upsert({where:{email:name+'@example.test'},update:{passwordHash:hash},create:{email:name+'@example.test',fullName:'Synthetic '+name,passwordHash:hash,role:'customer'}});
  if(!await db.address.findFirst({where:{userId:user.id}}))await db.address.create({data:{userId:user.id,label:'Synthetic address',addressText:'Generated demonstration location',latitude:36.75,longitude:3.06,isDefault:true}});
 }
 console.log('Synthetic customer accounts ready.');
})().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>db.$disconnect());
