# AI Playground

## Project Description

AI Playground is a web application designed to provide an interactive space where users can engage in conversations with an AI, upload files, and manage multiple discussions. This project was initiated in response to a user request for a platform that allows them to interact with an AI, manage multiple conversations, and send messages. The application aims to offer a seamless experience for both text-based and file-based interactions with the AI, with a clean and intuitive interface.

## Core Features

-   **Multiple Conversations:** Users can create and manage multiple distinct conversations, allowing them to discuss different topics or engage in separate lines of thought without mixing their chat histories.
-   **Conversation Persistence:** Conversations are saved to the browser's local storage, ensuring that the chat history is retained across browser sessions. Users can pick up where they left off, even after closing and reopening the application.
-   **New Chat Creation:** Starting a new conversation is straightforward, with a dedicated "New Chat" button prominently placed in the sidebar.
-   **Chat Switching:** Users can easily switch between active conversations, allowing them to multitask and manage their interactions with the AI efficiently.
-   **Chat Deletion:** Conversations can be deleted when no longer needed, with a confirmation dialog to prevent accidental deletions.
-   **Message Sending:** Users can send messages to the AI in real time, receiving responses promptly.
-   **AI Responses:** The AI processes user messages and generates relevant responses, which are then displayed in the chat history.
-   **Loading Indicator:** A loading indicator is displayed while the AI is processing a response, giving users clear feedback that their request is being handled.
-   **Error Handling:** The application handles errors gracefully, displaying informative messages if the AI fails to generate a response.
-   **Real-time Display:** New messages are displayed in real-time as they are sent and received, creating a dynamic and engaging chat experience.
- **Code block rendering:** The AI response is rendered properly if it contain a code block.
- **Copy Button:** you can copy the content from each message using a copy button.
-   **File Attachments:** Users can attach image files (JPEG, PNG, WEBP, GIF) or text files (.txt) to their messages, enabling the AI to process and respond to visual or textual data.
-   **File Preview:** Before sending, users can see the name of the attached file, providing a confirmation that the correct file has been selected.
-   **File Removal:** Users have the option to remove an attached file before sending the message, allowing them to make changes if needed.
- **Start a chat with a file:** when you attach a file with no current chat the app create a new chat.
- **Clear input:** When a chat is selected, or a new chat is created, the input field is cleared.
-   **File Type Validation:** The application only allows the attachment of supported file types, helping prevent user errors and ensuring data consistency.
- **Gradient Border on input:** The input field has a beautiful gradient border when it has a content.
- **Enter key shortcut:** you can send a message using the enter key.

## Technologies Used

-   **React:** For building the user interface with a component-based architecture.
-   **Next.js:** For routing, server-side rendering (SSR), and static site generation (SSG).
-   **Zod:** For data validation, ensuring data integrity and preventing unexpected behavior.
-   **React Hook Form:** For managing form state and form submission with ease.
-   **UUID:** For generating unique IDs for conversations.
-   **Lucide Icons:** For providing a consistent set of icons.
-   **Tailwind CSS:** For utility-first styling, making the interface modern and responsive.
- **localStorage:** For data persistence.

## Setup Instructions

1.  **Clone the Repository:**
```
bash
    git clone [repository-url]
    
```
2.  **Navigate to the Project Directory:**
```
bash
    cd ai-playground
    
```
3.  **Install Dependencies:**
```
bash
    npm install
    
```
4.  **Start the Development Server:**
```
bash
    npm run dev
    
```
5.  **Open the Application:**
    Open your web browser and visit `http://localhost:3000` to view the application.

## Original User Request

This project was initiated in response to a user's desire for a platform that would allow them to interact with an AI, manage multiple conversations, and send messages. The user wanted a system that could handle both text-based interactions and the ability to process information from attached files, all within a user-friendly interface. AI Playground was created to fulfill this specific need.