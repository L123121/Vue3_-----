import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lowcode'

export async function connectDB() {
    try {
        await mongoose.connect(MONGODB_URI)
        console.log('✅ MongoDB 已连接')
    } catch (err) {
        console.error('❌ MongoDB 连接失败:', err.message)
        process.exit(1)
    }
}

export default mongoose