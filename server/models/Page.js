import mongoose from 'mongoose'

const pageSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
        default: '未命名页面',
    },
    description: {
        type: String,
        default: '',
        maxlength: 500,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    // 页面 canvas 数据
    componentData: {
        type: Array,
        default: [],
    },
    canvasStyle: {
        type: Object,
        default: {
            width: 1200,
            height: 740,
            scale: 100,
            color: '#000',
            opacity: 1,
            backgroundColor: '#fff',
            fontSize: 14,
        },
    },
    // 分享
    shareToken: {
        type: String,
        default: null,
        index: true,
        sparse: true,
    },
    isPublic: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
})

pageSchema.pre('save', function (next) {
    this.updatedAt = new Date()
    next()
})

const Page = mongoose.model('Page', pageSchema)
export default Page