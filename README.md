# FrameForge
FrameForge is an AI-powered PC building assistant that helps users create custom computer builds based on their budget and requirements. Using advanced component matching and compatibility checking, FrameForge ensures optimal part selection while maximizing performance within your budget constraints.

## Live Demo
[https://abc.com](Live App Demo)

## Features
- Smart budget allocation across components
- Real-time compatibility checking
- AI-powered component recommendations
- Interactive part selection interface
- Comprehensive component database with 18,000+ parts
- Price tracking and performance scoring
- Customizable build preferences

## Technologies Used
- Next.js 15 with App Router
- Tailwind CSS and Shadcn UI
- Zustand for state management
- Pinecone for vector database
- LangChain for AI processing
- OpenAI for component analysis

## Use Cases
- Create custom PC builds within specific budget constraints
- Compare component options with detailed specifications
- Verify compatibility between selected parts
- Get AI-powered recommendations for optimal component matching
- Track prices and performance metrics across different builds

## Installation Steps
1. Clone the repository
```bash
git clone https://github.com/yourusername/frameforge.git
cd frameforge
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables
Create a `.env.local` file:
```env
PINECONE_API_KEY=
OPENAI_API_KEY=
```

4. Start development server
```bash
npm run dev
```

5. Open `http://localhost:3000`

## Screenshots
<div style="display: flex; justify-content: space-between;">
  <img src="/frameforge-landing.png" alt="FrameForge Landing Page" style="width: 49%;" />
  <img src="/frameforge-builder.png" alt="PC Builder Interface" style="width: 49%;" />
</div>
<div style="display: flex; justify-content: space-between;">
  <img src="/frameforge-components.png" alt="Component Selection" style="width: 49%;" />
  <img src="/frameforge-summary.png" alt="Build Summary" style="width: 49%;" />
</div>

## How to Use
1. Set your total budget
2. Select component preferences (CPU/GPU brand, cooling requirements)
3. Choose components with AI-guided recommendations
4. Review compatibility and performance metrics
5. Optimize build based on AI suggestions
6. Save or share your completed build

## Component Database
- CPUs: 1,188 entries
- GPUs: 5,165 entries
- Motherboards: 93 entries
- Memory: 1,093 entries
- Storage: 3,790 entries
- Cases: 3,698 entries
- Power Supplies: 2,478 entries
- CPU Coolers: 1,296 entries

## Contributing
1. Fork the repository
2. Create feature branch (`git checkout -b feature/NewFeature`)
3. Commit changes (`git commit -m 'Add NewFeature'`)
4. Push to branch (`git push origin feature/NewFeature`)
5. Open Pull Request

## License
MIT License - see [LICENSE](LICENSE) file

## Contact
Open an issue in the GitHub repository for support or questions.
