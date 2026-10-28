export const mockQuestions = [
  {
    id: 1,
    title: "Data Structures & Complexity",
    question: "What is the worst-case time complexity of searching for an element in an unbalanced Binary Search Tree (BST)?",
    options: [
      "O(1)",
      "O(log n)",
      "O(n)",
      "O(n log n)"
    ],
    correctAnswer: 2,
    explanation: "In an unbalanced binary search tree, all elements may be arranged in a degenerate linear chain, resulting in O(n) search time."
  },
  {
    id: 2,
    title: "Operating Systems & Concurrency",
    question: "Which of the following conditions is NOT required for a deadlock to occur in a distributed system?",
    options: [
      "Mutual Exclusion",
      "Hold and Wait",
      "Preemption Allowed",
      "Circular Wait"
    ],
    correctAnswer: 2,
    explanation: "Deadlock requires 'No Preemption'. If preemption is allowed, resources can be forcibly reclaimed, preventing deadlocks."
  },
  {
    id: 3,
    title: "Modern Web Protocols",
    question: "HTTP/2 introduces stream multiplexing over a single TCP connection. Which transport protocol does HTTP/3 switch to for eliminating Head-of-Line blocking?",
    options: [
      "SCTP",
      "QUIC over UDP",
      "WebSocket",
      "TCP Fast Open"
    ],
    correctAnswer: 1,
    explanation: "HTTP/3 uses QUIC running over UDP, allowing independent packet streams without TCP-level head-of-line blocking."
  },
  {
    id: 4,
    title: "Machine Learning & Neural Networks",
    question: "In computer vision models using Convolutional Neural Networks, what is the primary purpose of Dropout during training?",
    options: [
      "To increase the learning rate dynamically",
      "To prevent overfitting by randomly deactivating neurons",
      "To normalize feature activations across mini-batches",
      "To accelerate forward pass inference speed"
    ],
    correctAnswer: 1,
    explanation: "Dropout randomly sets a fraction of input units to 0 at each update during training time, which helps prevent overfitting."
  },
  {
    id: 5,
    title: "Database Indexing",
    question: "Why are B+ Trees predominantly preferred over standard B-Trees in relational database storage engines (such as MySQL InnoDB)?",
    options: [
      "B+ Trees have fewer levels for the same dataset size",
      "All satellite data pointers are stored exclusively in leaf nodes linked sequentially, optimizing range scans",
      "B+ Trees consume significantly less memory for root nodes",
      "Standard B-Trees cannot store duplicate keys"
    ],
    correctAnswer: 1,
    explanation: "In a B+ Tree, data records/pointers reside only in leaf nodes which form a linked list, enabling fast sequential range queries."
  },
  {
    id: 6,
    title: "Network Security & Cryptography",
    question: "Which cryptographic algorithm provides asymmetric encryption and is founded on the difficulty of the discrete logarithm problem over elliptic curves?",
    options: [
      "AES-256-GCM",
      "ECDSA / ECC",
      "RSA-4096",
      "SHA-3"
    ],
    correctAnswer: 1,
    explanation: "Elliptic Curve Cryptography (ECC) and ECDSA rely on the algebraic structure of elliptic curves over finite fields."
  },
  {
    id: 7,
    title: "System Design & Caching",
    question: "Under the Cache-Aside (Lazy Loading) pattern, what happens when a cache miss occurs?",
    options: [
      "The request is rejected and returns an HTTP 504 error",
      "The application queries the database, writes the result to the cache, and returns it to the client",
      "The database triggers an asynchronous webhook to populate Redis",
      "The cache automatically loads data from disk without application intervention"
    ],
    correctAnswer: 1,
    explanation: "In cache-aside, the application handles the miss by fetching from the persistent store and populating the cache before responding."
  },
  {
    id: 8,
    title: "Computer Vision & Pose Estimation",
    question: "In perspective 3D-to-2D head pose estimation, what algorithm calculates the rotation and translation vectors from 2D facial landmarks and a 3D generic facial model?",
    options: [
      "Perspective-n-Point (PnP / solvePnP)",
      "Hough Circle Transform",
      "K-Means Clustering",
      "Optical Flow Lucas-Kanade"
    ],
    correctAnswer: 0,
    explanation: "solvePnP estimates the pose of a calibrated camera given a set of n 3D points and their corresponding 2D projections."
  }
];
